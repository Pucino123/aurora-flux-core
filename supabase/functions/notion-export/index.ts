import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
    if (!NOTION_API_KEY) {
      return new Response(JSON.stringify({ error: "NOTION_API_KEY not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { idea, avgConsensus, consensusLabel, personas, actionPlan, date } = await req.json();

    // Helper: color by consensus
    const bgColor = avgConsensus >= 70 ? "green" : avgConsensus >= 40 ? "yellow" : "red";

    // Build Notion blocks
    const blocks: any[] = [
      // Title callout
      {
        object: "block", type: "callout",
        callout: {
          rich_text: [{ type: "text", text: { content: `"${idea}"` }, annotations: { bold: true, italic: true } }],
          icon: { type: "emoji", emoji: "🏛️" },
          color: `${bgColor}_background`,
        },
      },
      { object: "block", type: "divider", divider: {} },
      // Consensus score
      {
        object: "block", type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: `📊 Consensus: ${avgConsensus}% — ${consensusLabel}` } }],
          color: bgColor,
        },
      },
      {
        object: "block", type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `Generated ${date}` }, annotations: { color: "gray" } }],
        },
      },
      { object: "block", type: "divider", divider: {} },
      // Advisor section header
      {
        object: "block", type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "🧠 Advisor Verdicts" } }] },
      },
    ];

    // One toggle per advisor
    for (const p of personas) {
      const voteEmoji = p.confidence >= 70 ? "✅" : p.confidence >= 40 ? "⚠️" : "❌";
      const personaColor = p.key === "elena" ? "green" : p.key === "helen" ? "yellow" : p.key === "anton" ? "red" : "blue";

      blocks.push({
        object: "block", type: "toggle",
        toggle: {
          rich_text: [
            { type: "text", text: { content: `${voteEmoji} ${p.name} ` }, annotations: { bold: true, color: personaColor } },
            { type: "text", text: { content: `— ${p.title} (${p.confidence}% confidence)` }, annotations: { color: "gray" } },
          ],
          children: [
            {
              object: "block", type: "callout",
              callout: {
                rich_text: [{ type: "text", text: { content: p.analysis } }],
                icon: { type: "emoji", emoji: voteEmoji },
                color: `${personaColor}_background`,
              },
            },
            {
              object: "block", type: "quote",
              quote: {
                rich_text: [
                  { type: "text", text: { content: "💬 " } },
                  { type: "text", text: { content: p.name }, annotations: { bold: true } },
                  { type: "text", text: { content: " asks: " } },
                  { type: "text", text: { content: p.question }, annotations: { italic: true } },
                ],
              },
            },
          ],
        },
      });
    }

    // Action plan
    blocks.push(
      { object: "block", type: "divider", divider: {} },
      {
        object: "block", type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "📋 Recommended Action Plan" } }] },
      },
      ...actionPlan.map((step: string, i: number) => ({
        object: "block", type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ type: "text", text: { content: step } }],
        },
      })),
      { object: "block", type: "divider", divider: {} },
      {
        object: "block", type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: "Powered by " } },
            {
              type: "text", text: { content: "Flux Boardroom", link: { url: "https://aurora-flux-core.lovable.app" } },
              annotations: { italic: true, color: "purple" },
            },
          ],
        },
      },
    );

    // Create the page — use search to find a parent page or default to workspace
    // First, find the user's most recent page to use as parent
    const searchResp = await fetch(`${NOTION_API_URL}/search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filter: { property: "object", value: "page" },
        sort: { direction: "descending", timestamp: "last_edited_time" },
        page_size: 1,
      }),
    });

    if (!searchResp.ok) {
      const errBody = await searchResp.text();
      return new Response(JSON.stringify({ error: `Notion search failed [${searchResp.status}]: ${errBody}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchResp.json();
    const parentPage = searchData.results?.[0];

    if (!parentPage) {
      return new Response(JSON.stringify({
        error: "No accessible Notion pages found. Make sure you've shared at least one page with your Notion integration.",
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create child page
    const pageResp = await fetch(`${NOTION_API_URL}/pages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { type: "page_id", page_id: parentPage.id },
        properties: {
          title: {
            title: [{ type: "text", text: { content: `🏛️ Council: ${idea.slice(0, 80)}${idea.length > 80 ? "…" : ""}` } }],
          },
        },
        children: blocks,
      }),
    });

    if (!pageResp.ok) {
      const errBody = await pageResp.text();
      return new Response(JSON.stringify({ error: `Notion page creation failed [${pageResp.status}]: ${errBody}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageData = await pageResp.json();
    return new Response(JSON.stringify({ success: true, url: pageData.url, pageId: pageData.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
