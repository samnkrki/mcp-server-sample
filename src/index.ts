import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
    name: "dragon-ball",
    version: "1.0.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    }
});

// Helper function for making NWS API requests
async function makeNWSRequest<T>(url: string): Promise<T | null> {
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Error making NWS request:", error);
        return null;
    }
}

interface AlertFeature {
    properties: {
        event?: string;
        areaDesc?: string;
        severity?: string;
        status?: string;
        headline?: string;
    };
}

// Format alert data
function formatAlert(feature: AlertFeature): string {
    const props = feature.properties;
    return [
        `Event: ${props.event || "Unknown"}`,
        `Area: ${props.areaDesc || "Unknown"}`,
        `Severity: ${props.severity || "Unknown"}`,
        `Status: ${props.status || "Unknown"}`,
        `Headline: ${props.headline || "No headline"}`,
        "---",
    ].join("\n");
}

interface ForecastPeriod {
    name?: string;
    temperature?: number;
    temperatureUnit?: string;
    windSpeed?: string;
    windDirection?: string;
    shortForecast?: string;
}

interface AlertsResponse {
    features: AlertFeature[];
}

interface PointsResponse {
    properties: {
        forecast?: string;
    };
}

interface ForecastResponse {
    properties: {
        periods: ForecastPeriod[];
    };
}

// Register weather tools
// server.registerTool(
//     "get_alerts",
//     {
//         title: "Get weather alerts for a state",
//         description: "Retrieve active weather alerts for a specified US state.",
//         inputSchema: z.object({
//             state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
//         }),
//         outputSchema: z.object({
//             content: z.array(z.object({
//                 type: z.string(),
//                 text: z.string(),
//             })),
//         })
//     },
//     async ({ state }) => {
//         const stateCode = state.toUpperCase();
//         const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
//         const alertsData = await makeNWSRequest<AlertsResponse>(alertsUrl);

//         if (!alertsData) {
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: "Failed to retrieve alerts data",
//                     },
//                 ],
//             };
//         }

//         const features = alertsData.features || [];
//         if (features.length === 0) {
//             return {
//                 content: [
//                     {
//                         type: "text",
//                         text: `No active alerts for ${stateCode}`,
//                     },
//                 ],
//             };
//         }

//         const formattedAlerts = features.map(formatAlert);
//         const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

//         return {
//             content: [
//                 {
//                     type: "text",
//                     text: alertsText,
//                 },
//             ],
//         };
//     },
// );

server.registerTool('dragonball-characters', {
    title: 'Dragon Ball Characters Fetcher',
    description: 'Get Dragon Ball characters data from the Dragon Ball API',
    inputSchema: {
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(10)
    },
    outputSchema: {
        items: z.array(z.object({
            id: z.number(),
            name: z.string(),
            ki: z.string(),
            maxKi: z.string(),
            race: z.string(),
            gender: z.string(),
            description: z.string(),
            image: z.string(),
            affiliation: z.string(),
            deletedAt: z.null()
        })),
        meta: z.object({
            totalItems: z.number(),
            itemCount: z.number(),
            itemsPerPage: z.number(),
            totalPages: z.number(),
            currentPage: z.number()
        }),
        links: z.object({
            first: z.string(),
            previous: z.string(),
            next: z.string(),
            last: z.string()
        })
    }
}, async ({ page = 1, limit = 10 }) => {
    try {
        const url = `https://dragonball-api.com/api/characters?page=${page}&limit=${limit}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            content: [{ 
                type: 'text', 
                text: `Retrieved ${data.meta.itemCount} characters from page ${page}. Total: ${data.meta.totalItems} characters available.`
            }],
            structuredContent: data
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch Dragon Ball characters: ${errorMessage}`);
    }
});

server.registerTool('dragonball-character-detail', {
    title: 'Dragon Ball Character Detail Fetcher',
    description: 'Get detailed information about a specific Dragon Ball character including their origin planet and transformations',
    inputSchema: {
        id: z.number().int().positive()
    },
    outputSchema: {
        id: z.number(),
        name: z.string(),
        ki: z.string(),
        maxKi: z.string(),
        race: z.string(),
        gender: z.string(),
        description: z.string(),
        image: z.string(),
        affiliation: z.string(),
        deletedAt: z.null(),
        originPlanet: z.object({
            id: z.number(),
            name: z.string(),
            isDestroyed: z.boolean(),
            description: z.string(),
            image: z.string(),
            deletedAt: z.null()
        }),
        transformations: z.array(z.object({
            id: z.number(),
            name: z.string(),
            image: z.string(),
            ki: z.string(),
            deletedAt: z.null()
        }))
    }
}, async ({ id }) => {
    try {
        const url = `https://dragonball-api.com/api/characters/${id}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        const textSummary = `
Character: ${data.name}
Race: ${data.race}
Gender: ${data.gender}
Affiliation: ${data.affiliation}
Max Power: ${data.maxKi}
Origin Planet: ${data.originPlanet?.name || 'Unknown'}
Transformations: ${data.transformations?.length || 0} available
        `.trim();

        return {
            content: [{
                type: 'text',
                text: textSummary
            }],
            structuredContent: data
        };
    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch Dragon Ball characters: ${errorMessage}`);
    }
});


async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});