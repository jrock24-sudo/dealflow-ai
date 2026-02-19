"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import type { Deal, Market } from "@/types/deals";
import { useDealStore } from "@/hooks/useDealStore";
import { ChatMessageBubble } from "./ChatMessage";
import { LeadsQueue } from "./LeadsQueue";
import { KanbanPipeline } from "./KanbanPipeline";
import { MapView } from "./MapView";
import { DealCard } from "./DealCard";
import { DealResearch } from "./DealResearch";

// ---- Types ----

interface AgentConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  systemPrompt: string;
}

interface LookupService {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  urlKey: string;
  color: string;
}

interface LookupHistoryEntry {
  service: string;
  time: string;
}

// ---- Constants ----

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  land_acquisition: {
    id: "land_acquisition",
    name: "Land Acquisition",
    icon: "🏗️",
    color: "#C8A23C",
    description: "2+ acre parcels for development, affordable housing, mixed-use, or luxury teardowns",
    systemPrompt: `You are an institutional-grade land acquisition analyst — think BlackRock Real Estate, Hines, or a top-tier family office. You have deep access to web search and you use it aggressively. Your job is to find real, actionable land deals in the target market by searching exhaustively across every available public and private data source.

SEARCH MANDATE — NON-NEGOTIABLE:
You MUST run at least 8–12 different web searches before concluding anything. Never give up after 1–2 searches. Search every source listed below. If one search returns nothing, immediately try another angle. Only after exhausting all search vectors may you say deals are scarce — and even then, show what you DID find even if marginal.

MANDATORY SEARCH SEQUENCE (run ALL of these):
1. "land for sale [market] 2 acres site:crexi.com"
2. "land for sale [market] acres site:loopnet.com"
3. "[market] vacant land 2+ acres 2025 listing"
4. "Clark County tax delinquent property list 2024 2025"
5. "site:assessor.clarkcountynv.gov land parcel"
6. "Las Vegas city surplus land sale auction 2025"
7. "Clark County surplus land disposition program"
8. "Nevada tax lien sale Clark County vacant land"
9. "[market] land for sale acres site:zillow.com"
10. "site:regrid.com Las Vegas vacant parcel acres"
11. "Bureau of Land Management BLM Nevada land auction Las Vegas"
12. "North Las Vegas Henderson land 2 acres for sale 2025"

CLARK COUNTY — ALWAYS SEARCH ALL JURISDICTIONS:
- City of Las Vegas · Henderson, NV · North Las Vegas, NV · Unincorporated Clark County · Boulder City, NV
- Search each one separately. One search per sub-market minimum.

DATA SOURCES — SEARCH ALL:
Public Records: Clark County Assessor (assessor.clarkcountynv.gov), Clark County Treasurer (tax delinquent), Nevada SOS, BLM Nevada, City of Las Vegas Land Management, Nevada SHPO
Listing Platforms: Crexi.com, LoopNet.com, Zillow Land, Realtor.com land, ListingHaven, LandWatch, LandAndFarm
Distress Sources: PropertyRadar.com, BatchLeads, ATTOM Data, Foreclosure.com, Auction.com, Hubzu
Parcel Data: Regrid.com, Vanguard (CAGIS), Clark County GIS

DEAL CRITERIA:
- MINIMUM 2.0 ACRES (hard floor — skip anything under 2.0 acres, no exceptions)
- Target land basis ≤ $700,000/acre
- Land cost must be ≤ 10% of total project cost
- Zoned or rezoning potential: R-3, R-4, C-1, C-2, MUD, TOD corridor, OZ/QCT eligible
- DEAL TYPES: Affordable Housing · Mixed-Use · Market-Rate Multifamily · Luxury Teardown · Tax Delinquent · City/Government Surplus · BLM Auction · Long-Held Private

FEASIBILITY CALCULATION (compute for every deal):
- Est. Buildable Units = acres × density (30 units/acre R-3, 50/acre R-4, 60/acre mixed-use)
- Est. Construction Cost = units × 1,000 sqft/unit × $200/sqft (market rate) or $175/sqft (affordable)
- Soft Costs = Construction × 22%
- Total Project Cost = Construction + Soft + Land
- Land % = Land Cost ÷ Total Project Cost × 100
- Flag ✅ if Land % ≤ 10%, ⚠️ if 10–15%, ❌ if > 15%

DEAL SIGNALS TO SURFACE:
Tax delinquent · Long-held (10+ yrs) · Absentee/out-of-state owner · Price reduced · 180+ DOM · Government surplus · BLM auction · Assemblage play · OZ/QCT eligible · Rezoning upside · TOD corridor · Affordable housing incentive zone

ADDRESS RULE: Every deal MUST have a real numbered street address. NEVER use intersection format. If only intersection found, skip it.
CURRENCY: Current listings only (2024–2025). Never return stale data.
DATA INTEGRITY: Never fabricate addresses, prices, or owner names. Financial calculations labeled "Est." are fine and expected.

OUTPUT FORMAT — wrap every deal in delimiters:
<<<DEAL>>>
{
  "address": "Full numbered street address, City, NV ZIP",
  "details": "X.X acres · Zoning · Key details from listing",
  "status": "strong",
  "statusLabel": "Strong Development Opportunity",
  "isQCT": false,
  "isOZ": false,
  "riskScore": "Low",
  "feasibilityScore": 8,
  "dealSignals": ["Tax Delinquent", "Long-held", "OZ Eligible"],
  "source": "Crexi / LoopNet / County Records / BLM / etc",
  "listingUrl": "actual URL from search",
  "owner": { "name": "if found or ''", "address": "if found or ''", "apn": "if found or ''", "ownerType": "Private / Corporate / Government / ''", "yearsOwned": "if found or ''" },
  "financials": [
    { "label": "Asking", "value": "$X,XXX,000" },
    { "label": "Per Acre", "value": "$XXX,000" },
    { "label": "Est. Units", "value": "XX units" },
    { "label": "Land %", "value": "X.X%", "highlight": true }
  ]
}
<<<END_DEAL>>>

After each deal block, add 2–3 lines of analysis: zoning upside, development type recommended, next action.`,
  },
  fix_and_flip: {
    id: "fix_and_flip",
    name: "Fix & Flip",
    icon: "🏠",
    color: "#4A9C6D",
    description: "Residential value-add properties targeting $300K-$350K+ profit margin",
    systemPrompt: `You are an institutional-grade fix & flip analyst — think a top-performing hedge fund real estate desk. You search aggressively and deeply across every available source to find undervalued residential properties with strong value-add potential. You never give up after one search.

SEARCH MANDATE:
Run at least 8–10 different searches before drawing conclusions. Try multiple angles. If one search is dry, pivot to another immediately.

MANDATORY SEARCH SEQUENCE (run ALL):
1. "[market] homes for sale 90+ days on market 2025"
2. "[market] price reduced homes for sale"
3. "[market] foreclosure listings bank owned REO 2025"
4. "[market] pre-foreclosure notice of default 2025"
5. "site:zillow.com [market] homes for sale days:90"
6. "site:redfin.com [market] homes price reduced"
7. "[market] probate sale estate sale homes 2025"
8. "site:auction.com [market] residential"
9. "site:hubzu.com [market] homes"
10. "[market] absentee owner single family homes"

INVESTMENT MODEL (apply to every deal):
- Target Purchase: ~$1,100,000
- Reno Budget: $70–$90/sqft (use $70 cosmetic, $90 full gut)
- Target ARV: ~$1,780,000 (verify with comps)
- Target Net Profit: ≥ $300,000 (ideal $350,000+)

DEAL MATH (calculate for every property):
1. Est. Reno = sqft × $80 (midpoint)
2. Holding & Closing = purchase × 9%
3. Total In = Purchase + Reno + Holding/Closing
4. Est. Profit = ARV − Total In
5. ROI % = Profit ÷ Total In × 100
6. Flag ✅ Strong if Profit ≥ $300K, ⚠️ Marginal if $200–299K, ❌ Not Qualified if < $200K

ARV ESTIMATION:
Search "[market] renovated homes sold [sqft range] [neighborhood] 2024 2025" to find comps.
ARV = avg $/sqft of renovated comps × subject sqft.
Always label as "Est. ARV" and note the comp basis.

DEAL QUALIFICATION RULES:
✅ Qualifies if: purchase ≥ 20% below ARV · reno ≤ $90/sqft · profit ≥ $300K · comps support ARV
⚠️ Marginal if: profit $200–299K or ARV uncertain
❌ Pass if: profit < $200K or purchase price too high

DEAL SIGNALS TO SURFACE:
90+ DOM · Price reduced · REO/Bank-owned · Pre-foreclosure/NOD · Estate/Probate sale · Absentee owner · Long-held (10+ yrs) · Below tax assessed value · Deferred maintenance

DATA SOURCES:
Listings: Zillow (90+ DOM filter), Redfin, Realtor.com, MLS
Distress: PropertyRadar.com, Auction.com, Hubzu, Foreclosure.com, ATTOM
Public Records: Clark County Assessor, Regrid.com, county recorder
Comps: Zillow sold, Redfin sold, Realtor.com recent sales

ADDRESS RULE: Every deal MUST have a real numbered street address. NEVER intersection format.
CURRENCY: Active listings only (2024–2025). No stale data.
DATA INTEGRITY: Addresses and list prices must come from real search results. Calculated financials labeled "Est." are expected and required.

OUTPUT FORMAT — wrap every deal in delimiters:
<<<DEAL>>>
{
  "address": "Full numbered street address, City, NV ZIP",
  "details": "X,XXX sqft · Year built · X DOM · Condition from listing",
  "status": "strong",
  "statusLabel": "Strong Deal",
  "isQCT": false,
  "isOZ": false,
  "riskScore": "Low",
  "feasibilityScore": 8,
  "dealSignals": ["90+ DOM", "Price Reduced", "REO"],
  "source": "Zillow / Redfin / Auction.com / etc",
  "listingUrl": "actual URL from search",
  "owner": { "name": "if found or ''", "address": "if found or ''", "apn": "if found or ''", "ownerType": "Private / Bank / Estate / ''", "yearsOwned": "if found or ''" },
  "financials": [
    { "label": "List", "value": "$X,XXX,000" },
    { "label": "Est. Reno", "value": "$XXX,000" },
    { "label": "Est. ARV", "value": "$X,XXX,000" },
    { "label": "Est. Profit", "value": "$XXX,000", "highlight": true }
  ]
}
<<<END_DEAL>>>

After each deal block, add 2–3 lines: renovation scope, ARV confidence level, recommended next action.`,
  },
};

const MARKETS: Market[] = [
  { id: "las_vegas", name: "Las Vegas, NV", county: "Clark County", state: "NV", stateAbbr: "NV" },
  { id: "miami", name: "Miami, FL", county: "Miami-Dade County", state: "Florida", stateAbbr: "FL" },
  { id: "orlando", name: "Orlando, FL", county: "Orange County", state: "Florida", stateAbbr: "FL" },
  { id: "tampa", name: "Tampa, FL", county: "Hillsborough County", state: "Florida", stateAbbr: "FL" },
  { id: "phoenix", name: "Phoenix, AZ", county: "Maricopa County", state: "Arizona", stateAbbr: "AZ" },
  { id: "jacksonville", name: "Jacksonville, FL", county: "Duval County", state: "Florida", stateAbbr: "FL" },
  { id: "custom", name: "+ Add Custom Market", county: "", state: "", stateAbbr: "" },
];

type UrlBuilderFn = (owner: Deal["owner"], market?: Market | null) => string;

// Slugify a string for URL paths (replace spaces with hyphens, strip special chars)
const slugify = (s: string) => s.trim().replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").replace(/-+/g, "-");

const buildLookupUrl: Record<string, UrlBuilderFn> = {
  tps_name: (owner, market) => {
    // TruePeopleSearch direct name search URL
    const name = owner.name?.trim() || "";
    const cityState = market?.name || "";
    return `https://www.truepeoplesearch.com/results?name=${encodeURIComponent(name)}&citystatezip=${encodeURIComponent(cityState)}`;
  },
  tps_address: (owner, market) => {
    // TruePeopleSearch direct address search URL
    const street = (owner.address || "").split(",")[0].trim();
    const cityState = market?.name || (owner.address?.split(",").slice(1).join(",").trim() ?? "");
    return `https://www.truepeoplesearch.com/results?streetaddress=${encodeURIComponent(street)}&citystatezip=${encodeURIComponent(cityState)}`;
  },
  fastpeople: (owner, market) => {
    // FastPeopleSearch direct name search — slug format: /name/First-Last/City-State
    const nameParts = (owner.name || "").trim().split(/\s+/);
    const nameSlug = nameParts.map(slugify).join("-");
    const citySlug = slugify(market?.name?.split(",")[0] || "");
    const stateAbbr = market?.stateAbbr || "";
    const location = citySlug && stateAbbr ? `${citySlug}-${stateAbbr}` : "";
    return location
      ? `https://www.fastpeoplesearch.com/name/${nameSlug}_${location}`
      : `https://www.fastpeoplesearch.com/name/${nameSlug}`;
  },
  whitepages: (owner, market) => {
    // WhitePages direct name search — /name/First-Last/City-State
    const nameSlug = slugify(owner.name || "");
    const citySlug = slugify(market?.name?.split(",")[0] || "");
    const stateAbbr = market?.stateAbbr || "";
    return citySlug && stateAbbr
      ? `https://www.whitepages.com/name/${nameSlug}/${citySlug}-${stateAbbr}`
      : `https://www.whitepages.com/name/${nameSlug}`;
  },
  spokeo: (owner) => {
    const nameSlug = slugify(owner.name || "");
    return `https://www.spokeo.com/${nameSlug}`;
  },
  beenverified: (owner, market) => {
    const name = owner.name?.trim() || "";
    const cityState = market?.name || "";
    return `https://www.beenverified.com/people/${encodeURIComponent(name)}?location=${encodeURIComponent(cityState)}`;
  },
  regrid: (owner) => {
    // Regrid parcel search by address
    const addr = owner.address || "";
    return `https://app.regrid.com/search?query=${encodeURIComponent(addr)}`;
  },
  propertyradar: () => "https://app.propertyradar.com/",
  county_owner: (_owner, market) => {
    const countyUrls: Record<string, string> = {
      las_vegas: "https://maps.clarkcountynv.gov/assessor/AssessorParcelDetail/ownr.aspx",
      miami: "https://www.miamidade.gov/Apps/PA/propertysearch/#/",
      orlando: "https://www.ocpafl.org/Searches/ParcelSearch.aspx",
      tampa: "https://gis.hcpafl.org/propertysearch/",
      phoenix: "https://mcassessor.maricopa.gov/",
      jacksonville: "https://paopropertysearch.coj.net/Basic/Search.aspx",
    };
    return countyUrls[market?.id ?? ""] || `https://www.google.com/search?q=${encodeURIComponent((market?.county ?? "") + " assessor property search")}`;
  },
  county_address: (owner, market) => {
    const countyUrls: Record<string, string> = {
      las_vegas: "https://maps.clarkcountynv.gov/assessor/AssessorParcelDetail/site.aspx",
      miami: "https://www.miamidade.gov/Apps/PA/propertysearch/#/",
      orlando: "https://www.ocpafl.org/Searches/ParcelSearch.aspx",
      tampa: "https://gis.hcpafl.org/propertysearch/",
      phoenix: "https://mcassessor.maricopa.gov/",
      jacksonville: "https://paopropertysearch.coj.net/Basic/Search.aspx",
    };
    return countyUrls[market?.id ?? ""] || `https://www.google.com/search?q=${encodeURIComponent((owner.address ?? "") + " " + (market?.county ?? "") + " assessor parcel")}`;
  },
  zillow: (owner) => {
    // Zillow address search
    const addr = owner.address || "";
    return `https://www.zillow.com/homes/${encodeURIComponent(addr)}_rb/`;
  },
  propstream: () => "https://app.propstream.com/",
  batchleads: () => "https://app.batchleads.io/",
  google: (owner, market) => {
    const city = market?.name?.split(",")[0] || "";
    return `https://www.google.com/search?q=${encodeURIComponent('"' + (owner.name || "") + '" "' + city + '" phone OR email OR address OR contact')}`;
  },
  linkedin: (owner) => `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(owner.name || "")}&origin=GLOBAL_SEARCH_HEADER`,
};

const LOOKUP_SERVICES: LookupService[] = [
  { id: "tps_name", name: "TruePeopleSearch", subtitle: "Direct name search", icon: "👤", urlKey: "tps_name", color: "#4CAF50" },
  { id: "tps_address", name: "TruePeopleSearch", subtitle: "Direct address search", icon: "📍", urlKey: "tps_address", color: "#4CAF50" },
  { id: "fastpeople", name: "FastPeopleSearch", subtitle: "Free people lookup", icon: "⚡", urlKey: "fastpeople", color: "#FF9800" },
  { id: "whitepages", name: "WhitePages", subtitle: "Direct name search", icon: "📖", urlKey: "whitepages", color: "#2196F3" },
  { id: "spokeo", name: "Spokeo", subtitle: "People & phone finder", icon: "🔎", urlKey: "spokeo", color: "#00BCD4" },
  { id: "beenverified", name: "BeenVerified", subtitle: "Background & contact", icon: "✅", urlKey: "beenverified", color: "#F57C00" },
  { id: "county_owner", name: "County Assessor", subtitle: "Search by owner name", icon: "🏛️", urlKey: "county_owner", color: "#9C27B0" },
  { id: "county_address", name: "County Assessor", subtitle: "Search by address/APN", icon: "🗺️", urlKey: "county_address", color: "#9C27B0" },
  { id: "zillow", name: "Zillow", subtitle: "Property listing", icon: "🏠", urlKey: "zillow", color: "#006AFF" },
  { id: "regrid", name: "Regrid", subtitle: "Parcel map + owner + APN data", icon: "🗺️", urlKey: "regrid", color: "#00BCD4" },
  { id: "propertyradar", name: "Property Radar", subtitle: "Distress signals + foreclosure data", icon: "📡", urlKey: "propertyradar", color: "#FF5722" },
  { id: "propstream", name: "PropStream", subtitle: "Nationwide property DB (sub. req.)", icon: "🏡", urlKey: "propstream", color: "#C8A23C" },
  { id: "batchleads", name: "BatchLeads", subtitle: "Skip tracing & leads (sub. req.)", icon: "📊", urlKey: "batchleads", color: "#E91E63" },
  { id: "google", name: "Google Deep Search", subtitle: "Name + city + contact info", icon: "🔍", urlKey: "google", color: "#EA4335" },
  { id: "linkedin", name: "LinkedIn", subtitle: "Professional/LLC search", icon: "💼", urlKey: "linkedin", color: "#0A66C2" },
];

// ---- Owner Lookup Panel ----

function OwnerLookupPanel({ deal, onClose, market }: { deal: Deal; onClose: () => void; market: Market }) {
  const [contactFound, setContactFound] = useState({ phone: "", email: "", phone2: "", notes: "" });
  const [lookupHistory, setLookupHistory] = useState<LookupHistoryEntry[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleLookup = (service: LookupService) => {
    const urlBuilder = buildLookupUrl[service.urlKey];
    if (!urlBuilder) return;
    window.open(urlBuilder(deal.owner, market), "_blank", "noopener,noreferrer");
    setLookupHistory((prev) => [...prev, { service: service.name + " — " + service.subtitle, time: new Date().toLocaleTimeString() }]);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(null), 2000); });
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={(e) => e.stopPropagation()}>
        <div style={s.panelHeader}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Owner Lookup</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f0ece2", fontFamily: "'Playfair Display', serif" }}>{deal.owner.name || "Unknown Owner"}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{deal.address}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            {deal.owner.name && (
              <button onClick={() => copy(deal.owner.name, "name")}
                style={{ ...s.copyBtn, background: copied === "name" ? "rgba(74,156,109,0.2)" : "rgba(255,255,255,0.05)" }}>
                {copied === "name" ? "✓ Copied" : "📋 Copy Name"}
              </button>
            )}
            <button onClick={onClose} style={s.closeBtn}>✕</button>
          </div>
        </div>
        <div style={s.panelBody}>
          <div style={s.panelLeft}>
            <div style={s.card}>
              <div style={s.cardTitle}>🏢 Property Details</div>
              <InfoRow label="Address" value={deal.address} onCopy={() => copy(deal.address, "addr")} copied={copied === "addr"} />
              {deal.owner.apn && <InfoRow label="APN" value={deal.owner.apn} onCopy={() => copy(deal.owner.apn!, "apn")} copied={copied === "apn"} />}
              {deal.owner.ownerType && <InfoRow label="Owner Type" value={deal.owner.ownerType} />}
              {deal.owner.yearsOwned && <InfoRow label="Years Owned" value={deal.owner.yearsOwned} />}
              {deal.details && <InfoRow label="Details" value={deal.details} />}
              {deal.isQCT !== undefined && <InfoRow label="QCT Status" value={deal.isQCT ? "✅ In Qualified Census Tract" : "❌ Not in QCT"} />}
              {deal.isOZ !== undefined && <InfoRow label="Opportunity Zone" value={deal.isOZ ? "✅ Yes" : "❌ No"} />}
              {deal.source && <InfoRow label="Source" value={deal.source} />}
            </div>
            {deal.financials && (
              <div style={s.card}>
                <div style={s.cardTitle}>💰 Deal Financials</div>
                {deal.financials.map((f, i) => (
                  <div key={i} style={s.infoRow}>
                    <span>{f.label}</span>
                    <span style={{ ...s.infoVal, color: f.highlight ? "#4A9C6D" : "#f0ece2" }}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={s.card}>
              <div style={s.cardTitle}>📋 Contact Info Found</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>Fill in as you find info →</div>
              <label style={s.fieldLabel}>Phone #1<input type="tel" placeholder="(702) 555-0123" value={contactFound.phone} onChange={(e) => setContactFound((p) => ({ ...p, phone: e.target.value }))} style={s.fieldInput} /></label>
              <label style={s.fieldLabel}>Phone #2<input type="tel" placeholder="Secondary..." value={contactFound.phone2} onChange={(e) => setContactFound((p) => ({ ...p, phone2: e.target.value }))} style={s.fieldInput} /></label>
              <label style={s.fieldLabel}>Email<input type="email" placeholder="owner@email.com" value={contactFound.email} onChange={(e) => setContactFound((p) => ({ ...p, email: e.target.value }))} style={s.fieldInput} /></label>
              <label style={s.fieldLabel}>Notes<textarea placeholder="LLC name, mailing address, notes..." value={contactFound.notes} onChange={(e) => setContactFound((p) => ({ ...p, notes: e.target.value }))} style={{ ...s.fieldInput, minHeight: 70, resize: "vertical" }} /></label>
            </div>
          </div>
          <div style={s.panelRight}>
            <div style={s.card}>
              <div style={s.cardTitle}>🔎 Search Services</div>
              <div style={{ fontSize: 11, color: "rgba(200,162,60,0.6)", marginBottom: 12, padding: "8px 10px", background: "rgba(200,162,60,0.06)", borderRadius: 6, border: "1px solid rgba(200,162,60,0.12)" }}>
                💡 Each button opens in a new tab. Manual lookup.
              </div>
              <div style={s.serviceGrid}>
                {LOOKUP_SERVICES.map((service) => (
                  <button key={service.id} onClick={() => handleLookup(service)} style={s.serviceBtn}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = service.color; e.currentTarget.style.background = `${service.color}10`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                    <span style={{ fontSize: 20 }}>{service.icon}</span>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#f0ece2" }}>{service.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{service.subtitle}</div>
                    </div>
                    <span style={{ fontSize: 11, color: service.color, marginLeft: "auto" }}>↗</span>
                  </button>
                ))}
              </div>
            </div>
            {lookupHistory.length > 0 && (
              <div style={s.card}>
                <div style={s.cardTitle}>📜 Session History</div>
                {lookupHistory.map((h, i) => (
                  <div key={i} style={{ ...s.infoRow, fontSize: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>{h.service}</span>
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div style={{ ...s.infoRow, cursor: onCopy ? "pointer" : "default" }} onClick={onCopy}>
      <span>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ ...s.infoVal, maxWidth: 220 }}>{value}</span>
        {onCopy && <span style={{ fontSize: 10, color: copied ? "#4A9C6D" : "rgba(255,255,255,0.2)" }}>{copied ? "✓" : "📋"}</span>}
      </div>
    </div>
  );
}

// ---- Calculators ----

function LandCalc({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState(5), [p, setP] = useState(600000), [t, setT] = useState("multifamily"), [u, setU] = useState(30), [sq, setSq] = useState(900);
  const cr: Record<string, [number, number]> = { multifamily: [180, 250], affordable: [160, 200], mixedUse: [200, 300] };
  const [lo, hi] = cr[t];
  const tu = a * u, ts = tu * sq, lc = a * p, cl = ts * lo, ch = ts * hi;
  const tl = cl + cl * 0.2 + lc, th = ch + ch * 0.25 + lc;
  const pl = (lc / th) * 100, ph2 = (lc / tl) * 100, q = ph2 <= 10;
  const f = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <div style={s.calcPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: "#C8A23C", fontFamily: "'Playfair Display', serif", fontSize: 18 }}>🏗️ Land Feasibility</h3>
        <button onClick={onClose} style={s.closeBtn}>✕</button>
      </div>
      <div style={s.calcGrid}>
        <label style={s.calcLbl}>Acres<input type="number" value={a} onChange={(e) => setA(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>Price/Acre<input type="number" value={p} onChange={(e) => setP(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>Type<select value={t} onChange={(e) => setT(e.target.value)} style={s.calcIn}><option value="multifamily">Multifamily</option><option value="affordable">Affordable</option><option value="mixedUse">Mixed-Use</option></select></label>
        <label style={s.calcLbl}>Units/Acre<input type="number" value={u} onChange={(e) => setU(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>Unit Sqft<input type="number" value={sq} onChange={(e) => setSq(+e.target.value)} style={s.calcIn} /></label>
      </div>
      <div style={s.calcRes}>
        <div style={s.rRow}><span>Units: {tu.toLocaleString()}</span><span>Sqft: {ts.toLocaleString()}</span></div>
        <div style={s.rRow}><span>Land Cost</span><span style={s.rVal}>{f(lc)}</span></div>
        <div style={s.rRow}><span>Construction</span><span style={s.rVal}>{f(cl)} – {f(ch)}</span></div>
        <div style={s.rRow}><span>Total Project</span><span style={s.rVal}>{f(tl)} – {f(th)}</span></div>
        <div style={{ ...s.rRow, borderTop: "1px solid rgba(200,162,60,0.3)", paddingTop: 10, marginTop: 6 }}>
          <span style={{ fontWeight: 700 }}>Land %</span>
          <span style={{ ...s.rVal, color: q ? "#4A9C6D" : "#E74C3C", fontWeight: 700 }}>{pl.toFixed(1)}% – {ph2.toFixed(1)}%</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 14, padding: 10, borderRadius: 8, background: q ? "rgba(74,156,109,0.12)" : "rgba(231,76,60,0.12)", color: q ? "#4A9C6D" : "#E74C3C", fontWeight: 700, fontSize: 14 }}>
          {q ? "✅ QUALIFIED — Land ≤ 10%" : "❌ NOT QUALIFIED — Exceeds 10%"}
        </div>
      </div>
    </div>
  );
}

function FlipCalc({ onClose }: { onClose: () => void }) {
  const [pu, setPu] = useState(1100000), [sq, setSq] = useState(4000), [rps, setRps] = useState(80), [ar, setAr] = useState(1780000), [hp, setHp] = useState(9);
  const rc = sq * rps, hc = pu * (hp / 100), ti = pu + rc + hc, pr = ar - ti;
  const roi = (pr / ti) * 100, sp = ((ar - pu) / ar) * 100, q = pr >= 300000 && rps <= 90 && sp >= 20;
  const f = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <div style={s.calcPanel}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ margin: 0, color: "#4A9C6D", fontFamily: "'Playfair Display', serif", fontSize: 18 }}>🏠 Flip Calculator</h3>
        <button onClick={onClose} style={s.closeBtn}>✕</button>
      </div>
      <div style={s.calcGrid}>
        <label style={s.calcLbl}>Purchase<input type="number" value={pu} onChange={(e) => setPu(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>Sqft<input type="number" value={sq} onChange={(e) => setSq(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>Reno $/Sqft<input type="number" value={rps} onChange={(e) => setRps(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>ARV<input type="number" value={ar} onChange={(e) => setAr(+e.target.value)} style={s.calcIn} /></label>
        <label style={s.calcLbl}>Holding %<input type="number" value={hp} onChange={(e) => setHp(+e.target.value)} style={s.calcIn} /></label>
      </div>
      <div style={s.calcRes}>
        <div style={s.rRow}><span>Reno</span><span style={s.rVal}>{f(rc)}</span></div>
        <div style={s.rRow}><span>Holding</span><span style={s.rVal}>{f(hc)}</span></div>
        <div style={s.rRow}><span>Total In</span><span style={s.rVal}>{f(ti)}</span></div>
        <div style={{ ...s.rRow, borderTop: "1px solid rgba(74,156,109,0.3)", paddingTop: 10, marginTop: 6 }}>
          <span style={{ fontWeight: 700 }}>Profit</span>
          <span style={{ ...s.rVal, color: pr >= 300000 ? "#4A9C6D" : "#E74C3C", fontWeight: 700, fontSize: 17 }}>{f(pr)}</span>
        </div>
        <div style={s.rRow}><span style={{ fontWeight: 700 }}>ROI</span><span style={{ ...s.rVal, color: "#C8A23C", fontWeight: 700 }}>{roi.toFixed(1)}%</span></div>
        <div style={{ textAlign: "center", marginTop: 14, padding: 10, borderRadius: 8, background: q ? "rgba(74,156,109,0.12)" : pr >= 250000 ? "rgba(200,162,60,0.12)" : "rgba(231,76,60,0.12)", color: q ? "#4A9C6D" : pr >= 250000 ? "#C8A23C" : "#E74C3C", fontWeight: 700, fontSize: 14 }}>
          {q ? "✅ STRONG DEAL" : pr >= 250000 ? "⚠️ MARGINAL" : "❌ NOT QUALIFIED"}
        </div>
      </div>
    </div>
  );
}

// ---- Main Export ----

type TabId = "chat" | "leads" | "pipeline" | "map";

export default function DealFlowDashboard() {
  const store = useDealStore();

  const [activeAgent, setActiveAgent] = useState("land_acquisition");
  const [selectedMarket, setSelectedMarket] = useState("las_vegas");
  const [customMarket, setCustomMarket] = useState("");
  const [showCalc, setShowCalc] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [lookupDeal, setLookupDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("chat");
  const [autoScan, setAutoScan] = useState<Record<string, boolean>>({ land_acquisition: false, fix_and_flip: false });
  const [scanning, setScanning] = useState<Record<string, boolean>>({ land_acquisition: false, fix_and_flip: false });
  const [isMobile, setIsMobile] = useState(false);
  const [researchDeal, setResearchDeal] = useState<Deal | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const chatEnd = useRef<HTMLDivElement>(null);
  const scanIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const agent = AGENT_CONFIGS[activeAgent];
  const market = MARKETS.find((m) => m.id === selectedMarket) || MARKETS[0];
  const marketLabel = selectedMarket === "custom" ? customMarket : market.name;

  // Derived from store
  const chat = store.getChatForAgent(activeAgent);
  const allDeals = [...store.leadsQueue, ...store.pipeline];

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { if (isMobile) setSidebar(false); }, [isMobile]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  // Run a scan for a specific agent
  const runScan = useCallback(async (agentId: string) => {
    setScanning((prev) => ({ ...prev, [agentId]: true }));
    try {
      const resp = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: agentId, market: marketLabel }),
      });
      const data = await resp.json();
      if (data.deals?.length) {
        const stamped = data.deals.map((d: Deal) => ({
          ...d,
          foundAt: new Date().toISOString(),
          agentId,
        }));
        store.addToLeadsQueue(stamped);
        setActiveTab("leads");
      }
    } catch (e) {
      console.error("Scan error:", e);
    }
    setScanning((prev) => ({ ...prev, [agentId]: false }));
  }, [marketLabel, store]);

  // Auto-scan intervals (every 24 hours)
  useEffect(() => {
    Object.keys(autoScan).forEach((agentId) => {
      if (autoScan[agentId] && !scanIntervals.current[agentId]) {
        runScan(agentId);
        scanIntervals.current[agentId] = setInterval(() => runScan(agentId), 24 * 60 * 60 * 1000);
      } else if (!autoScan[agentId] && scanIntervals.current[agentId]) {
        clearInterval(scanIntervals.current[agentId]);
        delete scanIntervals.current[agentId];
      }
    });
    return () => { Object.values(scanIntervals.current).forEach(clearInterval); };
  }, [autoScan, runScan]);

  // Chat send
  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    store.addQuery(activeAgent, marketLabel, msg);
    store.setChatForAgent(activeAgent, (prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    const ctx = selectedMarket === "custom" ? customMarket : `${market.name} (${market.county})`;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          system: `${agent.systemPrompt}\n\nCURRENT MARKET: ${ctx}\nCURRENT DATE: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}\n\nSEARCH DIRECTIVE: You MUST search aggressively before concluding anything. Run at least 8 different web searches. Try Crexi, LoopNet, Zillow, county records, tax delinquent lists, surplus auctions, BLM, PropertyRadar, Regrid — all of them. Do NOT say "nothing found" until you have exhausted every search angle. Every user question is a search task — start searching immediately.\n\n${ctx.toLowerCase().includes("clark county") || ctx.toLowerCase().includes("las vegas") ? "MARKET: Search ALL Clark County jurisdictions — City of Las Vegas, Henderson NV, North Las Vegas NV, Unincorporated Clark County, Boulder City. Search each separately.\n\n" : `MARKET: Search specifically within ${ctx}. Do not return results from other markets.\n\n`}SIZE FILTER: For land deals, ONLY include parcels 2.0 acres or larger. Skip anything under 2.0 acres.\n\nADDRESS FORMAT: Every deal MUST have a real numbered street address. Never intersection format.\n\nCURRENCY: Active listings from 2024–2025 only.\n\nDO NOT FABRICATE: Addresses and prices must come from real search results. Calculated financials labeled "Est." are expected — use them.\n\nOUTPUT: Wrap every deal in <<<DEAL>>>...<<<END_DEAL>>> delimiters so they render as deal cards.`,
          messages: [...chat.filter((m) => m.role === "user" || m.role === "assistant"), { role: "user", content: msg }],
        }),
      });
      if (r.status === 429) {
        store.setChatForAgent(activeAgent, (prev) => [...prev, { role: "assistant", content: "⏳ The AI is temporarily rate-limited. Wait 30–60 seconds, then try again." }]);
        setLoading(false);
        return;
      }
      if (!r.ok) {
        store.setChatForAgent(activeAgent, (prev) => [...prev, { role: "assistant", content: `⚠️ Server error (${r.status}). The AI is switching to backup — please try your question again.` }]);
        setLoading(false);
        return;
      }
      const d = await r.json();
      if (d.error?.type === "rate_limit_error" || (d.type === "error" && d.error)) {
        store.setChatForAgent(activeAgent, (prev) => [...prev, { role: "assistant", content: `⏳ Rate limited: ${d.error?.message || "Too many requests. Wait a moment and retry."}` }]);
        setLoading(false);
        return;
      }
      const text = (d.content as Array<{ type: string; text?: string }>)
        ?.map((i) => (i.type === "text" ? i.text : ""))
        .filter(Boolean)
        .join("\n");
      const reply = text || "⚠️ No response received. Please try again.";
      store.setChatForAgent(activeAgent, (prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      const err = e as Error;
      store.setChatForAgent(activeAgent, (prev) => [...prev, { role: "assistant", content: `⚠️ Connection issue.\n\n${err.message}` }]);
    }
    setLoading(false);
  }, [input, loading, chat, agent, market, selectedMarket, customMarket, activeAgent, store]);

  const prompts = activeAgent === "land_acquisition"
    ? [
        "Find off-market 2+ acre parcels — tax delinquent or long-held in Las Vegas",
        "Search county surplus land auctions and distressed land sales",
        "Vacant land in Qualified Opportunity Zones or QCTs in this market",
        "Find land with absentee/out-of-state owners for off-market outreach",
      ]
    : [
        "Find off-market homes — foreclosures, pre-foreclosures, and bank-owned properties",
        "Properties 90+ days on market with price reductions — motivated sellers",
        "Absentee owner properties with flip potential under $1.1M",
        "Probate and estate sale properties in this market",
      ];

  const sampleDeals: Deal[] = activeAgent === "land_acquisition" ? [
    {
      id: "sample_land_1",
      address: "N Las Vegas Blvd & Tropical Pkwy — 4.2 Acres",
      details: "R-3 Zoned · Near VA-215 · Opportunity Zone",
      status: "strong", statusLabel: "Strong Opportunity",
      isQCT: true, isOZ: true, source: "Clark County Surplus",
      riskScore: "Low", feasibilityScore: 9,
      dealSignals: ["Long-held (12 yrs)", "QCT eligible", "OZ eligible"],
      owner: { name: "Tropical Pkwy Holdings LLC", address: "N Las Vegas Blvd, Las Vegas, NV", apn: "139-32-501-007", ownerType: "Corporate/LLC", yearsOwned: "12" },
      financials: [{ label: "Asking", value: "$2.7M" }, { label: "Per Acre", value: "$643K" }, { label: "Est. Units", value: "126" }, { label: "Land %", value: "7.8%", highlight: true }],
    },
    {
      id: "sample_land_2",
      address: "Craig Rd & Losee Rd — 8.1 Acres, North Las Vegas, NV",
      details: "C-2 Commercial · Rezoning potential · Employment corridor",
      status: "marginal", statusLabel: "Rezoning Required",
      isQCT: false, isOZ: false, source: "LoopNet",
      riskScore: "Medium", feasibilityScore: 6,
      dealSignals: ["Assemblage play", "Zoning upside"],
      owner: { name: "James R Morrison", address: "4521 Craig Rd, North Las Vegas, NV 89032", apn: "139-27-812-003", ownerType: "Private Individual", yearsOwned: "18" },
      financials: [{ label: "Asking", value: "$6.2M" }, { label: "Per Acre", value: "$765K" }, { label: "Est. Units", value: "243" }, { label: "Land %", value: "11.2%", highlight: true }],
    },
  ] : [
    {
      id: "sample_flip_1",
      address: "2847 Pinto Ln, Las Vegas, NV 89107",
      details: "4,200 sqft · 1987 · 94 DOM · 2 price reductions",
      status: "strong", statusLabel: "Strong Deal", source: "Zillow",
      riskScore: "Low", feasibilityScore: 9,
      dealSignals: ["90+ DOM", "Price reduced 15%", "Absentee owner"],
      owner: { name: "Robert Chen", address: "2847 Pinto Ln, Las Vegas, NV 89107", apn: "163-05-410-022", ownerType: "Absentee Owner", yearsOwned: "15" },
      financials: [{ label: "List", value: "$985K" }, { label: "Reno", value: "$336K" }, { label: "ARV", value: "$1.78M" }, { label: "Profit", value: "$371K", highlight: true }],
    },
    {
      id: "sample_flip_2",
      address: "8901 W Flamingo Rd, Las Vegas, NV 89147",
      details: "5,100 sqft · 1995 · 120+ DOM · Original condition",
      status: "strong", statusLabel: "Strong Deal", source: "Redfin",
      riskScore: "Low", feasibilityScore: 8,
      dealSignals: ["90+ DOM", "Original condition", "Private Individual"],
      owner: { name: "Thomas Nakamura", address: "8901 W Flamingo Rd, Las Vegas, NV 89147", apn: "163-21-713-008", ownerType: "Private Individual", yearsOwned: "28" },
      financials: [{ label: "List", value: "$1.05M" }, { label: "Reno", value: "$459K" }, { label: "ARV", value: "$1.85M" }, { label: "Profit", value: "$352K", highlight: true }],
    },
  ];

  const toggleAutoScan = (agentId: string) => {
    setAutoScan((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  };

  const leadsCount = store.leadsQueue.length;
  const pipelineCount = store.pipeline.length;

  const tabBadge = (count: number) =>
    count > 0 ? (
      <span style={{ position: "absolute", top: -4, right: -4, background: "#C8A23C", color: "#000", borderRadius: "50%", minWidth: 16, height: 16, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
        {count > 99 ? "99+" : count}
      </span>
    ) : null;

  const sidebarContent = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg, #C8A23C, #8B6914)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#f0ece2", fontFamily: "'Playfair Display', serif" }}>DealFlow AI</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 2, textTransform: "uppercase" }}>Agent Network v3</div>
        </div>
      </div>

      <div style={s.secLabel}>Agents</div>
      {Object.values(AGENT_CONFIGS).map((ag) => (
        <div key={ag.id} style={{ ...s.agentCard, borderColor: activeAgent === ag.id ? ag.color : "rgba(255,255,255,0.06)", background: activeAgent === ag.id ? `${ag.color}08` : "transparent" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => { setActiveAgent(ag.id); if (isMobile) setSidebar(false); }}>
            <span style={{ fontSize: 22 }}>{ag.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: ag.color }}>{ag.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{ag.description.slice(0, 42)}...</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            <button
              onClick={() => runScan(ag.id)}
              disabled={scanning[ag.id]}
              style={{ fontSize: 10, fontWeight: 600, color: scanning[ag.id] ? "rgba(255,255,255,0.3)" : ag.color, background: "rgba(255,255,255,0.04)", border: `1px solid ${ag.color}30`, borderRadius: 6, padding: "4px 8px", cursor: scanning[ag.id] ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif", flex: 1 }}>
              {scanning[ag.id] ? "⏳ Scanning..." : "▶ Run Now"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 }}>Auto</span>
              <div onClick={() => toggleAutoScan(ag.id)}
                style={{ width: 32, height: 18, borderRadius: 9, background: autoScan[ag.id] ? ag.color : "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", transition: "background .2s" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: autoScan[ag.id] ? 16 : 2, transition: "left .2s" }} />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={s.secLabel}>Market</div>
      <select value={selectedMarket} onChange={(e) => setSelectedMarket(e.target.value)} style={s.select}>
        {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {selectedMarket === "custom" && (
        <input type="text" placeholder="City, State" value={customMarket} onChange={(e) => setCustomMarket(e.target.value)} style={{ ...s.select, marginTop: 6 }} />
      )}

      <div style={s.secLabel}>Tools</div>
      <button onClick={() => setShowCalc(showCalc === "land" ? null : "land")} style={{ ...s.toolBtn, borderColor: showCalc === "land" ? "#C8A23C" : "rgba(255,255,255,0.08)" }}>🏗️ Land Calc</button>
      <button onClick={() => setShowCalc(showCalc === "flip" ? null : "flip")} style={{ ...s.toolBtn, borderColor: showCalc === "flip" ? "#4A9C6D" : "rgba(255,255,255,0.08)" }}>🏠 Flip Calc</button>

      {/* Session History */}
      {(() => {
        const sessions = store.getSessionsForAgent(activeAgent);
        if (sessions.length === 0) return null;
        return (
          <>
            <div style={{ ...s.secLabel, display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
              <span>Chat History</span>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {showHistory ? "▲ hide" : "▼ show"}
              </button>
            </div>
            {showHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {sessions.map((session) => (
                  <div key={session.id} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                    <button
                      onClick={() => {
                        store.setChatForAgent(activeAgent, session.messages);
                        setActiveTab("chat");
                        if (isMobile) setSidebar(false);
                      }}
                      style={{ flex: 1, fontSize: 11, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, padding: "7px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left", lineHeight: 1.3, transition: "all .15s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = agent.color; e.currentTarget.style.color = "#f0ece2"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {session.title}</div>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
                        {new Date(session.timestamp).toLocaleDateString()} · {session.messages.length} messages
                      </div>
                    </button>
                    <button
                      onClick={() => store.deleteSession(session.id)}
                      title="Delete session"
                      style={{ fontSize: 10, color: "rgba(255,80,80,0.4)", background: "none", border: "none", cursor: "pointer", padding: "6px 4px", flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

      <div style={s.secLabel}>Data Sources</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", lineHeight: 1.8, paddingLeft: 4 }}>
        ✓ Claude AI (web_search)<br />
        ✓ Crexi · LoopNet (search)<br />
        ✓ Zillow · Redfin (search)<br />
        ✓ County Assessors<br />
        <span style={{ color: "rgba(255,165,0,0.5)" }}>○ RPR API (key needed)<br />○ MLS (key needed)</span>
      </div>
    </>
  );

  return (
    <div style={s.container}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      {lookupDeal && <OwnerLookupPanel deal={lookupDeal} onClose={() => setLookupDeal(null)} market={market} />}
      {researchDeal && (
        <DealResearch
          deal={researchDeal}
          agentColor={agent.color}
          agentName={agent.name}
          market={marketLabel}
          onClose={() => setResearchDeal(null)}
          onSaveToPipeline={(deal) => store.saveToPipeline({ ...deal, agentId: activeAgent })}
          isPipelined={store.isPipelined}
        />
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 90 }} onClick={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <div style={{
        ...s.sidebar,
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, height: "100%", zIndex: 100,
          transform: sidebar ? "translateX(0)" : "translateX(-100%)",
          width: 270, padding: "20px 16px", overflow: "hidden auto",
        } : {
          width: sidebar ? 270 : 0,
          padding: sidebar ? "20px 16px" : 0,
          overflow: "hidden",
        }),
        transition: "all .3s",
      }}>
        {sidebarContent}
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Top Bar */}
        <div style={s.topBar}>
          <button onClick={() => setSidebar(!sidebar)} style={{ background: "none", border: "none", color: "#f0ece2", fontSize: 18, cursor: "pointer", padding: "4px 6px" }}>☰</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f0ece2" }}>{agent.icon} {agent.name}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", display: isMobile ? "none" : "inline" }}>📍 {marketLabel}</span>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 3, marginLeft: isMobile ? "auto" : 16 }}>
            {([
              { id: "chat", label: "💬 Chat", badge: 0 },
              { id: "leads", label: "📋 Leads", badge: leadsCount },
              { id: "pipeline", label: "📊 Pipeline", badge: pipelineCount },
              { id: "map", label: "🗺️ Map", badge: 0 },
            ] as const).map(({ id, label, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{ position: "relative", fontSize: 12, fontWeight: 600, color: activeTab === id ? "#f0ece2" : "rgba(255,255,255,0.35)", background: activeTab === id ? "rgba(255,255,255,0.1)" : "transparent", border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {isMobile ? label.split(" ")[0] : label}
                {tabBadge(badge)}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", alignItems: "center", gap: 6 }}>
            {(scanning.land_acquisition || scanning.fix_and_flip) && <span style={{ fontSize: 10, color: "#C8A23C" }}>⏳ Scanning...</span>}
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4A9C6D", boxShadow: "0 0 6px #4A9C6D" }} />
            {!isMobile && <span style={{ fontSize: 11, color: "#4A9C6D" }}>Online</span>}
          </div>
        </div>

        {showCalc === "land" && <LandCalc onClose={() => setShowCalc(null)} />}
        {showCalc === "flip" && <FlipCalc onClose={() => setShowCalc(null)} />}

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <LeadsQueue
            deals={store.leadsQueue}
            onLookup={setLookupDeal}
            onClear={() => store.setLeadsQueue([])}
            onSaveToPipeline={store.saveToPipeline}
            isPipelined={store.isPipelined}
            onRemove={store.removeFromLeads}
            onResearch={setResearchDeal}
          />
        )}

        {/* Pipeline Tab */}
        {activeTab === "pipeline" && (
          <KanbanPipeline
            pipeline={store.pipeline}
            onMoveStage={store.movePipelineStage}
            onRemove={store.removeFromPipeline}
            onLookup={setLookupDeal}
            onAddOutreach={store.addOutreach}
            onResearch={setResearchDeal}
          />
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <MapView
            deals={allDeals}
            geocache={store.geocache}
            onCacheCoords={store.cacheCoords}
            onLookup={setLookupDeal}
          />
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <>
            <div style={s.chatArea}>
              {chat.length === 0 && (
                <div style={s.welcome}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>{agent.icon}</div>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#f0ece2", fontFamily: "'Playfair Display', serif" }}>{agent.name} Agent</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 6, padding: "0 10px" }}>{agent.description}</div>
                  <div style={{ fontSize: 11, color: "rgba(200,162,60,0.5)", marginBottom: 24, padding: "8px 14px", borderRadius: 8, background: "rgba(200,162,60,0.06)", border: "1px solid rgba(200,162,60,0.1)", maxWidth: 520 }}>
                    💡 Enable <strong>Auto</strong> toggle for daily deal scanning · Deals appear as interactive cards · Click <strong>＋ Save to Pipeline</strong> to track
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, maxWidth: 580, width: "100%" }}>
                    {prompts.map((p, i) => (
                      <button key={i} onClick={() => setInput(p)} style={s.quickBtn}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = agent.color; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)"; }}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div style={{ width: "100%", maxWidth: 680, marginTop: 28 }}>
                    <div style={s.secLabel}>Sample Deals</div>
                    {sampleDeals.map((d) => (
                      <DealCard
                        key={d.id}
                        deal={{ ...d, agentId: activeAgent }}
                        onLookup={setLookupDeal}
                        onSaveToPipeline={store.saveToPipeline}
                        isSaved={store.isPipelined(d)}
                        onResearch={setResearchDeal}
                        color={agent.color}
                      />
                    ))}
                  </div>
                </div>
              )}
              {chat.map((m, i) => (
                <ChatMessageBubble
                  key={i}
                  role={m.role}
                  content={m.content}
                  agentColor={agent.color}
                  isMobile={isMobile}
                  onLookup={setLookupDeal}
                  onSaveToPipeline={(deal) => store.saveToPipeline({ ...deal, agentId: activeAgent })}
                  isPipelined={store.isPipelined}
                  onResearch={setResearchDeal}
                />
              ))}
              {loading && (
                <div style={{ display: "flex", gap: 5, padding: 14 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: agent.color, animation: "pulse 1.4s infinite", animationDelay: `${i * 0.2}s`, opacity: 0.4 }} />
                  ))}
                </div>
              )}
              <div ref={chatEnd} />
            </div>

            {/* Input */}
            <div style={s.inputArea}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={`Ask the ${agent.name} agent...`}
                  style={s.input}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  style={{ ...s.sendBtn, background: input.trim() ? agent.color : "rgba(255,255,255,0.06)", color: input.trim() ? "#0a0a0a" : "rgba(255,255,255,0.2)" }}>
                  →
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>
                  AI · Crexi · LoopNet · Zillow · Web search · Always verify independently
                </div>
                <button
                  onClick={() => {
                    if (chat.length > 0) store.saveSession(activeAgent, marketLabel, chat);
                    store.clearChatForAgent(activeAgent);
                  }}
                  style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
                  ✦ New Chat
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1.2)}}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.22)}
        select option{background:#1a1a1a;color:#f0ece2}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px}
        input[type='date']::-webkit-calendar-picker-indicator{filter:invert(0.6)}
      `}</style>
    </div>
  );
}

// ---- Styles ----

const s: Record<string, CSSProperties> = {
  container: { display: "flex", height: "100vh", width: "100%", background: "#0c0c0c", fontFamily: "'DM Sans', sans-serif", color: "#f0ece2", overflow: "hidden" },
  sidebar: { background: "#111", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", flexShrink: 0 },
  secLabel: { fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8, marginTop: 20, fontWeight: 600 },
  agentCard: { position: "relative", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 12, marginBottom: 6, transition: "all .2s" },
  select: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", color: "#f0ece2", fontSize: 12, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  toolBtn: { width: "100%", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", color: "#f0ece2", fontSize: 12, cursor: "pointer", textAlign: "left", marginBottom: 4, fontFamily: "'DM Sans', sans-serif", transition: "all .2s" },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" },
  topBar: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)", flexWrap: "nowrap" },
  chatArea: { flex: 1, overflowY: "auto", padding: 20 },
  welcome: { display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 24, textAlign: "center" },
  quickBtn: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 14px", color: "rgba(255,255,255,0.55)", fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: "'DM Sans', sans-serif", transition: "all .2s", lineHeight: 1.4 },
  inputArea: { padding: "14px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" },
  input: { flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#f0ece2", fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif", minWidth: 0 },
  sendBtn: { width: 44, height: 44, borderRadius: 10, border: "none", fontSize: 18, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .2s", flexShrink: 0 },
  calcPanel: { margin: "12px 16px", padding: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 },
  calcGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 },
  calcLbl: { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.45)" },
  calcIn: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "#f0ece2", fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif" },
  calcRes: { background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: 16 },
  rRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, color: "rgba(255,255,255,0.55)" },
  rVal: { color: "#f0ece2", fontWeight: 600 },
  closeBtn: { background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 16, cursor: "pointer", padding: "4px 6px" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  panel: { background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, width: "100%", maxWidth: 920, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 24px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  panelBody: { display: "flex", gap: 18, padding: "18px 24px 24px", overflowY: "auto", flex: 1, flexWrap: "wrap" },
  panelLeft: { flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 280 },
  panelRight: { flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 280 },
  card: { background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#f0ece2", marginBottom: 12, fontFamily: "'Playfair Display', serif" },
  infoRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 12, color: "rgba(255,255,255,0.45)" },
  infoVal: { color: "#f0ece2", fontWeight: 500, fontSize: 12, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" },
  fieldLabel: { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 },
  fieldInput: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "#f0ece2", fontSize: 12, outline: "none", fontFamily: "'DM Sans', sans-serif", width: "100%" },
  serviceGrid: { display: "flex", flexDirection: "column", gap: 6 },
  serviceBtn: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, cursor: "pointer", transition: "all .2s", fontFamily: "'DM Sans', sans-serif", width: "100%" },
  copyBtn: { fontSize: 11, color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all .2s" },
};
