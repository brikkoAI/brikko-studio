import { describe, expect, it } from "vitest";
import { collectPresentBrikkoStudioTools } from "./brikko-studio-tools.registration.js";
import { createPdfTool } from "./tools/pdf-tool.js";

describe("createBrikkoStudioTools PDF registration", () => {
  it("includes the pdf tool when the pdf factory returns a tool", () => {
    const pdfTool = createPdfTool({
      agentDir: "/tmp/brikko-studio-agent-main",
      config: {
        agents: {
          defaults: {
            pdfModel: { primary: "openai/gpt-5.4-mini" },
          },
        },
      },
    });

    expect(pdfTool?.name).toBe("pdf");
    expect(collectPresentBrikkoStudioTools([pdfTool]).map((tool) => tool.name)).toContain("pdf");
  });
});
