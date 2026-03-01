import { useCallback } from "react";
import html2canvas from "html2canvas";
import { LABEL_HEIGHT, LABEL_WIDTH } from "@/components/product-mockup/product-mockup-constants";

export function useProductMockupExport(props: any) {
  const colorToCmyk = useCallback((colorStr: string): string => {
    let r = 0;
    let g = 0;
    let b = 0;

    if (colorStr.startsWith("#")) {
      const hex = colorStr.replace("#", "");
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else {
      const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        r = parseInt(match[1]);
        g = parseInt(match[2]);
        b = parseInt(match[3]);
      }
    }

    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    if (k === 1) return "C: 0% M: 0% Y: 0% K: 100%";

    const c = Math.round(((1 - rNorm - k) / (1 - k)) * 100);
    const m = Math.round(((1 - gNorm - k) / (1 - k)) * 100);
    const y = Math.round(((1 - bNorm - k) / (1 - k)) * 100);
    const kPct = Math.round(k * 100);

    return `C: ${c}% M: ${m}% Y: ${y}% K: ${kPct}%`;
  }, []);

  const handleExportProject = useCallback(async () => {
    if (!props.projectName || !props.projectEmail) {
      props.toast({
        title: "Project info required",
        description: "Please set project name and email first.",
        variant: "destructive",
      });
      return;
    }

    if (props.elements.length === 0) {
      props.toast({
        title: "Nothing to export",
        description: "Add some text or logos to your design first.",
        variant: "destructive",
      });
      return;
    }

    props.setIsExporting(true);

    try {
      const cleanCanvas = document.createElement("canvas");
      cleanCanvas.width = LABEL_WIDTH;
      cleanCanvas.height = LABEL_HEIGHT;
      const cleanCtx = cleanCanvas.getContext("2d")!;

      if (props.showKraftEffect) {
        props.applyKraftBase(cleanCtx, LABEL_WIDTH, LABEL_HEIGHT);
        cleanCtx.globalCompositeOperation = "multiply";
      } else {
        cleanCtx.fillStyle = "#ffffff";
        cleanCtx.fillRect(0, 0, LABEL_WIDTH, LABEL_HEIGHT);
      }

      props.elements.filter((el: any) => el.visible !== false).forEach((el: any) => {
        cleanCtx.save();
        cleanCtx.translate(el.x, el.y);
        cleanCtx.rotate((el.rotation * Math.PI) / 180);
        cleanCtx.scale(el.scale, el.scale);

        if (el.type === "logo" && el.image) {
          cleanCtx.drawImage(el.image, -el.image.width / 2, -el.image.height / 2, el.image.width, el.image.height);
        } else if (el.type === "text") {
          cleanCtx.font = `bold ${el.fontSize || 32}px ${el.font || "Arial"}`;
          cleanCtx.fillStyle = el.color || "#1a1a1a";
          cleanCtx.textAlign = "center";
          cleanCtx.textBaseline = "middle";
          cleanCtx.fillText(el.content, 0, 0);
        }

        cleanCtx.restore();
      });
      cleanCtx.globalCompositeOperation = "source-over";

      const designPng = cleanCanvas.toDataURL("image/png").split(",")[1];

      let mockupPng = "";
      if (props.productPreviewRef.current) {
        try {
          const canvas = await html2canvas(props.productPreviewRef.current, {
            backgroundColor: "#e8dcc8",
            useCORS: true,
            allowTaint: true,
            scale: 2,
          });
          mockupPng = canvas.toDataURL("image/png").split(",")[1];
        } catch (err) {
          console.error("html2canvas failed:", err);
        }
      }

      const exportElements = props.elements.map((el: any) => ({
        type: el.type,
        content: el.content,
        font: el.font || "Arial",
        fontSize: el.fontSize || 36,
        visualSize: Math.round((el.fontSize || 36) * el.scale * 10) / 10,
        color: el.color || "#1a1a1a",
        cmyk: colorToCmyk(el.color || "#1a1a1a"),
        x: el.x,
        y: el.y,
        scale: el.scale,
        rotation: el.rotation,
      }));

      const exportAssets = props.elements.filter((el: any) => el.type === "logo" && el.originalAsset).map((el: any) => el.originalAsset);

      const response = await fetch("/api/label-projects/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: props.projectName,
          projectEmail: props.projectEmail,
          designPng,
          mockupPng,
          elements: exportElements,
          savedSwatches: props.savedSwatches,
          assets: exportAssets,
        }),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${props.projectName.replace(/[^a-z0-9]/gi, "_")}_project.zip`;
      link.click();
      URL.revokeObjectURL(url);

      const driveFolderUrl = response.headers.get("X-Drive-Folder-Url");

      props.toast({
        title: "Project exported!",
        description: driveFolderUrl ? "ZIP downloaded and backed up to Google Drive." : "ZIP downloaded successfully.",
      });
    } catch (error) {
      console.error("Export error:", error);
      props.toast({
        title: "Export failed",
        description: "There was an error exporting your project. Please try again.",
        variant: "destructive",
      });
    } finally {
      props.setIsExporting(false);
    }
  }, [
    props.applyKraftBase,
    props.elements,
    props.productPreviewRef,
    props.projectEmail,
    props.projectName,
    props.savedSwatches,
    props.setIsExporting,
    props.showKraftEffect,
    props.toast,
    colorToCmyk,
  ]);

  return {
    colorToCmyk,
    handleExportProject,
  };
}
