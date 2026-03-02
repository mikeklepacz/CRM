import JSZip from "jszip";
import * as googleDrive from "../../googleDrive";
import { generateProjectSpecsPdf, type ColorSwatch, type TextElement } from "../pdfBuilder";

type LabelAsset = {
  name?: string;
  data?: string;
};

type BuildLabelProjectExportParams = {
  projectName?: string;
  projectEmail?: string;
  designPng?: string;
  mockupPng?: string;
  elements?: TextElement[];
  savedSwatches?: ColorSwatch[];
  assets?: LabelAsset[];
};

export class LabelProjectExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabelProjectExportValidationError";
  }
}

export async function buildLabelProjectExport(params: BuildLabelProjectExportParams): Promise<{
  zipBuffer: Buffer;
  driveUrl: string;
  filename: string;
}> {
  const {
    projectName,
    projectEmail,
    designPng,
    mockupPng,
    elements = [],
    savedSwatches = [],
    assets = [],
  } = params;

  if (!projectName || !projectEmail) {
    throw new LabelProjectExportValidationError("Project name and email are required");
  }

  if (!designPng || !mockupPng) {
    throw new LabelProjectExportValidationError("Design and mockup images are required");
  }

  console.log(`[Label Export] Starting export for project: ${projectName}`);

  const pdfBuffer = await generateProjectSpecsPdf({
    projectName,
    projectEmail,
    designPng,
    mockupPng,
    elements,
    savedSwatches,
  });

  console.log(`[Label Export] PDF generated, size: ${pdfBuffer.length} bytes`);

  const zip = new JSZip();
  const designData = designPng.replace(/^data:image\/\w+;base64,/, "");
  const mockupData = mockupPng.replace(/^data:image\/\w+;base64,/, "");

  zip.file("design.png", designData, { base64: true });
  zip.file("3d-mockup.png", mockupData, { base64: true });
  zip.file("project-specs.pdf", pdfBuffer);

  if (assets.length > 0) {
    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
      for (const asset of assets) {
        if (asset.name && asset.data) {
          const assetData = asset.data.replace(/^data:[^;]+;base64,/, "");
          assetsFolder.file(asset.name, assetData, { base64: true });
        }
      }
    }
  }

  console.log(`[Label Export] ZIP created with ${3 + assets.length} files`);

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  console.log(`[Label Export] ZIP generated, size: ${zipBuffer.length} bytes`);

  let driveUrl = "";
  try {
    const pdfBase64 = pdfBuffer.toString("base64");
    const driveResult = await googleDrive.uploadProjectToDrive(projectName, projectEmail, {
      designPng: designData,
      mockupPng: mockupData,
      specsPdf: pdfBase64,
      assets: assets as any,
    });
    driveUrl = driveResult.folderUrl;
    console.log(`[Label Export] Uploaded to Google Drive: ${driveUrl}`);
  } catch (driveError: any) {
    console.error("[Label Export] Google Drive upload failed:", driveError.message);
  }

  const filename = `${projectName.replace(/[^a-zA-Z0-9-_]/g, "_")}_label_project.zip`;
  return {
    zipBuffer,
    driveUrl,
    filename,
  };
}
