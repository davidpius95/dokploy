const rawBrandName = process.env.NEXT_PUBLIC_BRAND_NAME?.trim();
const fallbackBrandName = "GuildServer";
const brandName =
	rawBrandName && rawBrandName.length > 0 ? rawBrandName : fallbackBrandName;

const rawBrandSlug = process.env.NEXT_PUBLIC_BRAND_SLUG?.trim();
const inferredBrandSlug = brandName
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/(^-|-$)/g, "");

export const BRAND_NAME = brandName;
export const BRAND_SLUG =
	rawBrandSlug && rawBrandSlug.length > 0 ? rawBrandSlug : inferredBrandSlug;

const defaultWebsiteUrl = "https://guildserver.com";
const defaultGithubUrl = "https://github.com/GuildServer/guildserver";
const defaultDocsUrl = "https://docs.guildserver.com";

export const BRAND_GITHUB_URL =
	process.env.NEXT_PUBLIC_BRAND_GITHUB_URL?.trim() || defaultGithubUrl;
export const BRAND_DOCS_URL =
	process.env.NEXT_PUBLIC_BRAND_DOCS_URL?.trim() || defaultDocsUrl;
export const BRAND_WEBSITE_URL =
	process.env.NEXT_PUBLIC_BRAND_WEBSITE_URL?.trim() || defaultWebsiteUrl;
