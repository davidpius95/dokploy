import { parse } from "toml";

/**
 * Complete template interface that includes both metadata and configuration
 */
export interface CompleteTemplate {
	metadata: {
		id: string;
		name: string;
		description: string;
		tags: string[];
		version: string;
		logo: string;
		links: {
			github: string;
			website?: string;
			docs?: string;
		};
	};
	variables: {
		[key: string]: string;
	};
	config: {
		domains: Array<{
			serviceName: string;
			port: number;
			path?: string;
			host?: string;
		}>;
		env: Record<string, string>;
		mounts?: Array<{
			filePath: string;
			content: string;
		}>;
	};
}

interface TemplateMetadata {
	id: string;
	name: string;
	description: string;
	version: string;
	logo: string;
	links: {
		github: string;
		website?: string;
		docs?: string;
	};
	tags: string[];
}

/**
 * Fetches the list of available templates from meta.json
 */
const DEFAULT_TEMPLATES_BASE_URL =
	"https://raw.githubusercontent.com/dokploy/templates/main";

const normalizeBaseUrl = (baseUrl?: string | null): string => {
	if (!baseUrl) {
		return DEFAULT_TEMPLATES_BASE_URL;
	}

	const trimmed = baseUrl.trim();
	if (!trimmed) {
		return DEFAULT_TEMPLATES_BASE_URL;
	}

	return trimmed.replace(/\/+$/, "");
};

export async function fetchTemplatesList(
	baseUrl?: string | null,
): Promise<TemplateMetadata[]> {
	try {
		const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
		const response = await fetch(`${resolvedBaseUrl}/meta.json`);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch templates from ${resolvedBaseUrl}: ${response.status} ${response.statusText}`,
			);
		}
		const templates = (await response.json()) as TemplateMetadata[];
		return templates.map((template) => ({
			id: template.id,
			name: template.name,
			description: template.description,
			version: template.version,
			logo: template.logo,
			links: template.links,
			tags: template.tags,
		}));
	} catch (error) {
		console.error("Error fetching templates list:", error);
		throw error;
	}
}

/**
 * Fetches a specific template's files
 */
export async function fetchTemplateFiles(
	templateId: string,
	baseUrl?: string | null,
): Promise<{ config: CompleteTemplate; dockerCompose: string }> {
	try {
		const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
		// Fetch both files in parallel
		const [templateYmlResponse, dockerComposeResponse] = await Promise.all([
			fetch(`${resolvedBaseUrl}/blueprints/${templateId}/template.toml`),
			fetch(`${resolvedBaseUrl}/blueprints/${templateId}/docker-compose.yml`),
		]);

		if (!templateYmlResponse.ok || !dockerComposeResponse.ok) {
			throw new Error("Template files not found");
		}

		const [templateYml, dockerCompose] = await Promise.all([
			templateYmlResponse.text(),
			dockerComposeResponse.text(),
		]);

		const config = parse(templateYml) as CompleteTemplate;

		return { config, dockerCompose };
	} catch (error) {
		console.error(`Error fetching template ${templateId}:`, error);
		throw error;
	}
}
