import { readAccountData, writeAccountData } from "./account-data";

export type ProfileDetails = {
  avatarDataUrl: string;
  githubUrl: string;
  linkedinUrl: string;
};

export type ProfileLinkKind = "github" | "linkedin";

const PROFILE_KEY = "dsa-profile-details";
const emptyProfile: ProfileDetails = { avatarDataUrl: "", githubUrl: "", linkedinUrl: "" };

export function validateProfileUrl(value: string, kind: ProfileLinkKind): string | null {
  const input = value.trim();
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return "Enter a complete URL starting with https://";
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash) return "Use a secure HTTPS profile URL without extra credentials or fragments.";
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname.split("/").filter(Boolean);
  if (kind === "github") {
    const usernamePattern = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;
    if (hostname !== "github.com") return "Use an official github.com profile URL.";
    if (segments.length !== 1 || !usernamePattern.test(segments[0])) return "Use the format https://github.com/username.";
  } else {
    const slugPattern = /^[a-z0-9][a-z0-9-_%]{0,99}$/i;
    if (hostname !== "linkedin.com") return "Use an official linkedin.com profile URL.";
    if (segments.length !== 2 || segments[0].toLowerCase() !== "in" || !slugPattern.test(segments[1])) return "Use the format https://linkedin.com/in/username.";
  }
  return null;
}

export function getProfileDetails(): ProfileDetails {
  const saved = readAccountData<Partial<ProfileDetails> | null>(PROFILE_KEY, null);
  return { ...emptyProfile, ...saved };
}

export function saveProfileDetails(details: ProfileDetails) {
  if (typeof window === "undefined") return;
  writeAccountData(PROFILE_KEY, details);
  window.dispatchEvent(new Event("dsa-profile-changed"));
}
