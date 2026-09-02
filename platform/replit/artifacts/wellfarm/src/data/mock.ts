export type Severity = "low" | "moderate" | "high";
export type ScanStatus = "Reviewed" | "Pending review" | "Flagged";

export interface Scan {
  id: string;
  crop: string;
  condition: string;
  farmer: string;
  district: string;
  state: string;
  severity: Severity;
  confidence: number;
  status: ScanStatus;
  date: string;
  verified: boolean;
  imageQuality: "Good" | "Fair" | "Poor";
}

export const crops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Groundnut", "Tomato", "Potato", "Onion"];
export const conditions = ["Rice bacterial leaf blight", "Rice brown spot", "Maize northern leaf blight", "Maize fall armyworm damage", "Tomato early blight", "Potato late blight", "Wheat leaf rust", "Healthy", "Unknown", "Unsupported crop / condition", "Poor-quality image"];
export const states = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];

const seedRows: [string, string, string, string, string, Severity, number, boolean, ScanStatus][] = [
  ["WF-24041", "Rice", "Rice bacterial leaf blight", "Cuttack", "Odisha", "moderate", 0.84, true, "Flagged"],
  ["WF-24040", "Rice", "Rice bacterial leaf blight", "Kendrapara", "Odisha", "moderate", 0.79, false, "Pending review"],
  ["WF-24039", "Wheat", "Wheat leaf rust", "Karnal", "Haryana", "high", 0.91, true, "Flagged"],
  ["WF-24038", "Potato", "Potato late blight", "Darjeeling", "West Bengal", "high", 0.88, false, "Flagged"],
  ["WF-24037", "Maize", "Maize fall armyworm damage", "Mandla", "Madhya Pradesh", "moderate", 0.73, false, "Pending review"],
  ["WF-24036", "Tomato", "Tomato early blight", "Nashik", "Maharashtra", "low", 0.69, true, "Reviewed"],
  ["WF-24035", "Cotton", "Healthy", "Akola", "Maharashtra", "low", 0.96, true, "Reviewed"],
  ["WF-24034", "Onion", "Unknown", "Lasalgaon", "Maharashtra", "low", 0.51, false, "Pending review"],
  ["WF-24033", "Rice", "Rice brown spot", "Raipur", "Chhattisgarh", "moderate", 0.76, true, "Reviewed"],
  ["WF-24032", "Sugarcane", "Healthy", "Kolhapur", "Maharashtra", "low", 0.94, true, "Reviewed"],
  ["WF-24031", "Soybean", "Healthy", "Indore", "Madhya Pradesh", "low", 0.92, true, "Reviewed"],
  ["WF-24030", "Groundnut", "Unknown", "Junagadh", "Gujarat", "low", 0.58, false, "Pending review"],
  ["WF-24029", "Rice", "Rice bacterial leaf blight", "Puri", "Odisha", "moderate", 0.81, true, "Flagged"],
  ["WF-24028", "Maize", "Maize northern leaf blight", "Udupi", "Karnataka", "moderate", 0.78, false, "Pending review"],
  ["WF-24027", "Wheat", "Healthy", "Ludhiana", "Punjab", "low", 0.95, true, "Reviewed"],
  ["WF-24026", "Potato", "Potato late blight", "Hooghly", "West Bengal", "high", 0.86, true, "Flagged"],
  ["WF-24025", "Tomato", "Tomato early blight", "Kolar", "Karnataka", "moderate", 0.77, false, "Pending review"],
  ["WF-24024", "Rice", "Poor-quality image", "Kochi", "Kerala", "low", 0.31, false, "Pending review"],
  ["WF-24023", "Cotton", "Unknown", "Warangal", "Telangana", "low", 0.49, false, "Pending review"],
  ["WF-24022", "Rice", "Rice brown spot", "Thanjavur", "Tamil Nadu", "moderate", 0.72, true, "Reviewed"],
  ["WF-24021", "Wheat", "Wheat leaf rust", "Meerut", "Uttar Pradesh", "moderate", 0.83, true, "Flagged"],
  ["WF-24020", "Maize", "Healthy", "Amritsar", "Punjab", "low", 0.93, true, "Reviewed"],
  ["WF-24019", "Potato", "Potato late blight", "Agra", "Uttar Pradesh", "high", 0.89, false, "Flagged"],
  ["WF-24018", "Tomato", "Unknown", "Patna", "Bihar", "low", 0.47, false, "Pending review"],
  ["WF-24017", "Rice", "Rice bacterial leaf blight", "Ganjam", "Odisha", "moderate", 0.82, true, "Flagged"],
  ["WF-24016", "Onion", "Healthy", "Nashik", "Maharashtra", "low", 0.95, true, "Reviewed"],
  ["WF-24015", "Sugarcane", "Healthy", "Belagavi", "Karnataka", "low", 0.91, true, "Reviewed"],
  ["WF-24014", "Soybean", "Unknown", "Bhopal", "Madhya Pradesh", "low", 0.54, false, "Pending review"],
  ["WF-24013", "Groundnut", "Healthy", "Anantapur", "Andhra Pradesh", "low", 0.94, true, "Reviewed"],
  ["WF-24012", "Maize", "Maize fall armyworm damage", "Nizamabad", "Telangana", "moderate", 0.75, false, "Flagged"],
  ["WF-24011", "Rice", "Rice brown spot", "Malda", "West Bengal", "moderate", 0.7, false, "Pending review"],
  ["WF-24010", "Wheat", "Wheat leaf rust", "Kota", "Rajasthan", "moderate", 0.8, true, "Reviewed"],
  ["WF-24009", "Tomato", "Tomato early blight", "Vellore", "Tamil Nadu", "moderate", 0.74, true, "Reviewed"],
  ["WF-24008", "Potato", "Healthy", "Shimla", "Himachal Pradesh", "low", 0.97, true, "Reviewed"],
  ["WF-24007", "Rice", "Rice bacterial leaf blight", "Cuttack", "Odisha", "moderate", 0.8, false, "Flagged"],
  ["WF-24006", "Cotton", "Healthy", "Yavatmal", "Maharashtra", "low", 0.93, true, "Reviewed"],
  ["WF-24005", "Maize", "Maize northern leaf blight", "Dharwad", "Karnataka", "moderate", 0.79, false, "Pending review"],
  ["WF-24004", "Rice", "Healthy", "Bargarh", "Odisha", "low", 0.95, true, "Reviewed"],
  ["WF-24003", "Onion", "Unknown", "Dhar", "Madhya Pradesh", "low", 0.53, false, "Pending review"],
  ["WF-24002", "Wheat", "Healthy", "Hisar", "Haryana", "low", 0.94, true, "Reviewed"],
  ["WF-24001", "Tomato", "Tomato early blight", "Pune", "Maharashtra", "moderate", 0.76, false, "Flagged"],
];

export const scans: Scan[] = seedRows.map(([id, crop, condition, district, state, severity, confidence, verified, status], index) => ({
  id, crop, condition, farmer: index === 0 ? "S. Pradhan" : `Farmer ${String.fromCharCode(65 + (index % 20))}`, district, state, severity, confidence, verified, status, date: `2025-${String(3 + Math.floor(index / 12)).padStart(2, "0")}-${String(3 + (index % 24)).padStart(2, "0")}`, imageQuality: confidence > .7 ? "Good" : confidence > .5 ? "Fair" : "Poor",
}));

export const recentScans = scans.slice(0, 5);
export const weather = { location: "Cuttack district (approx.)", temperature: "29°C", humidity: "78%", rain: "7.4 mm", wind: "11 km/h", source: "Sample weather", updated: "Sample snapshot · 08:40 IST" };
export const trend = [18, 21, 19, 28, 31, 38, 43, 48, 45, 54, 59, 66];
export const districtSummaries = [
  { district: "Cuttack", state: "Odisha", severity: "moderate" as Severity, reports: 18, farms: 14, change: "+31%", latitude: 20.4625, longitude: 85.883 },
  { district: "Karnal", state: "Haryana", severity: "high" as Severity, reports: 14, farms: 9, change: "+18%", latitude: 29.6857, longitude: 76.9905 },
  { district: "Darjeeling", state: "West Bengal", severity: "high" as Severity, reports: 12, farms: 8, change: "+24%", latitude: 27.041, longitude: 88.2663 },
  { district: "Nashik", state: "Maharashtra", severity: "low" as Severity, reports: 9, farms: 7, change: "-6%", latitude: 19.9975, longitude: 73.7898 },
  { district: "Kolar", state: "Karnataka", severity: "moderate" as Severity, reports: 8, farms: 6, change: "+9%", latitude: 13.1362, longitude: 78.1291 },
];
export const allIndiaSummary = { reports: 412, farms: 286, high: 9, moderate: 21, low: 7, pending: 26 };
export const modelEvaluation = { evaluated: "18 Mar 2025", reviewed: 27, changed: 64, skipped: 1_284, candidate: "0.78 macro F1", current: "0.74 macro F1", status: "Offline sample evaluation" };
export const cacheEntries = [{ condition: "Rice bacterial leaf blight", region: "Coastal Odisha", validations: 6, full: "4.8 s", cached: "0.7 s", freshness: "12 days" }, { condition: "Wheat leaf rust", region: "Haryana plains", validations: 4, full: "4.6 s", cached: "0.8 s", freshness: "21 days" }];
