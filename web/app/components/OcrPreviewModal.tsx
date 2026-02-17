"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";

type SelectionBox = { x: number; y: number; width: number; height: number };

type DragMode =
    | "create"
    | "move"
    | "resize-n"
    | "resize-s"
    | "resize-e"
    | "resize-w"
    | "resize-ne"
    | "resize-nw"
    | "resize-se"
    | "resize-sw";


type OcrPreviewModalProps = {
    isOpen: boolean;
    previewUrl: string | null;
    isOcring: boolean;
    onCancel: () => void;
    onConfirm: (croppedFile: File | null) => Promise<void> | void;
};

export default function OcrPreviewModal({
    isOpen,
    previewUrl,
    isOcring,
    onCancel,
    onConfirm,
}: OcrPreviewModalProps) {
    const previewImageRef = useRef<HTMLImageElement>(null);
    const previewOverlayRef = useRef<HTMLDivElement>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selection, setSelection] = useState<SelectionBox | null>(null);
    const dragStateRef = useRef<{
        mode: DragMode;
        startX: number;
        startY: number;
        startSelection: SelectionBox | null;
    } | null>(null);

    useEffect(() => {
        setSelection(null);
        dragStateRef.current = null;
        setIsSelecting(false);
    }, [previewUrl]);

    if (!isOpen || !previewUrl) {
        return null;
    }

    const clamp = (value: number, min: number, max: number) =>
        Math.min(Math.max(value, min), max);

    const getOverlaySize = () => {
        const rect = previewOverlayRef.current?.getBoundingClientRect();
        if (!rect) {
            return null;
        }
        return { width: rect.width, height: rect.height };
    };

    const getDefaultSelection = () => {
        const overlay = getOverlaySize();
        if (!overlay) {
            return null;
        }
        const width = Math.max(overlay.width * 0.6, 160);
        const height = Math.max(overlay.height * 0.4, 120);
        const x = (overlay.width - width) / 2;
        const y = (overlay.height - height) / 2;
        return {
            x,
            y,
            width: Math.min(width, overlay.width),
            height: Math.min(height, overlay.height),
        };
    };

    const getRelativePoint = (event: React.MouseEvent<HTMLDivElement>) => {
        const rect = previewOverlayRef.current?.getBoundingClientRect();
        if (!rect) {
            return null;
        }
        return {
            x: clamp(event.clientX - rect.left, 0, rect.width),
            y: clamp(event.clientY - rect.top, 0, rect.height),
        };
    };

    const getResizeMode = (point: { x: number; y: number }, box: SelectionBox) => {
        const handleSize = 8;
        const left = Math.abs(point.x - box.x) <= handleSize;
        const right = Math.abs(point.x - (box.x + box.width)) <= handleSize;
        const top = Math.abs(point.y - box.y) <= handleSize;
        const bottom = Math.abs(point.y - (box.y + box.height)) <= handleSize;

        if (top && left) return "resize-nw";
        if (top && right) return "resize-ne";
        if (bottom && left) return "resize-sw";
        if (bottom && right) return "resize-se";
        if (top) return "resize-n";
        if (bottom) return "resize-s";
        if (left) return "resize-w";
        if (right) return "resize-e";
        return null;
    };

    const isPointInside = (point: { x: number; y: number }, box: SelectionBox) =>
        point.x >= box.x &&
        point.x <= box.x + box.width &&
        point.y >= box.y &&
        point.y <= box.y + box.height;

    const handlePreviewMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        const point = getRelativePoint(event);
        if (!point) {
            return;
        }

        let nextSelection = selection;
        if (!nextSelection) {
            const fallback = getDefaultSelection();
            nextSelection = fallback ?? { x: point.x, y: point.y, width: 0, height: 0 };
            setSelection(nextSelection);
        }

        const mode = nextSelection
            ? getResizeMode(point, nextSelection) ||
            (isPointInside(point, nextSelection) ? "move" : "create")
            : "create";

        setIsSelecting(true);
        dragStateRef.current = {
            mode,
            startX: point.x,
            startY: point.y,
            startSelection: nextSelection,
        };

        if (mode === "create") {
            setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
        }
    };

    const handlePreviewMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isSelecting || !dragStateRef.current) {
            return;
        }
        const point = getRelativePoint(event);
        if (!point) {
            return;
        }
        const overlay = getOverlaySize();
        if (!overlay) {
            return;
        }

        const { mode, startX, startY, startSelection } = dragStateRef.current;
        const minSize = 20;

        if (mode === "create") {
            const x = Math.min(point.x, startX);
            const y = Math.min(point.y, startY);
            const width = Math.abs(point.x - startX);
            const height = Math.abs(point.y - startY);
            setSelection({ x, y, width, height });
            return;
        }

        if (!startSelection) {
            return;
        }

        if (mode === "move") {
            const dx = point.x - startX;
            const dy = point.y - startY;
            const nextX = clamp(
                startSelection.x + dx,
                0,
                overlay.width - startSelection.width
            );
            const nextY = clamp(
                startSelection.y + dy,
                0,
                overlay.height - startSelection.height
            );
            setSelection({
                x: nextX,
                y: nextY,
                width: startSelection.width,
                height: startSelection.height,
            });
            return;
        }

        let { x, y, width, height } = startSelection;
        const dx = point.x - startX;
        const dy = point.y - startY;

        if (mode.includes("e")) {
            width = clamp(startSelection.width + dx, minSize, overlay.width - startSelection.x);
        }
        if (mode.includes("s")) {
            height = clamp(startSelection.height + dy, minSize, overlay.height - startSelection.y);
        }
        if (mode.includes("w")) {
            const nextX = clamp(
                startSelection.x + dx,
                0,
                startSelection.x + startSelection.width - minSize
            );
            width = startSelection.width + (startSelection.x - nextX);
            x = nextX;
        }
        if (mode.includes("n")) {
            const nextY = clamp(
                startSelection.y + dy,
                0,
                startSelection.y + startSelection.height - minSize
            );
            height = startSelection.height + (startSelection.y - nextY);
            y = nextY;
        }

        setSelection({ x, y, width, height });
    };

    const handlePreviewMouseUp = () => {
        setIsSelecting(false);
        dragStateRef.current = null;
    };

    const createCroppedFile = async () => {
        const image = previewImageRef.current;
        if (!image || !previewOverlayRef.current) {
            return null;
        }
        const overlayRect = previewOverlayRef.current.getBoundingClientRect();
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;
        if (!naturalWidth || !naturalHeight || !overlayRect.width || !overlayRect.height) {
            return null;
        }

        const useSelection =
            selection && selection.width > 4 && selection.height > 4
                ? selection
                : { x: 0, y: 0, width: overlayRect.width, height: overlayRect.height };



        const cropRect = { x: useSelection.x, y: useSelection.y, width: useSelection.width, height: useSelection.height };
        const imageRect = image.getBoundingClientRect();
        imageRect.x = imageRect.x - overlayRect.x;
        imageRect.y = imageRect.y - overlayRect.y;

        //求cropRect和imageRect的交集
        const intersectX = Math.max(cropRect.x, imageRect.x);
        const intersectY = Math.max(cropRect.y, imageRect.y);
        const intersectRight = Math.min(cropRect.x + cropRect.width, imageRect.x + imageRect.width);
        const intersectBottom = Math.min(cropRect.y + cropRect.height, imageRect.y + imageRect.height);
        const intersectWidth = Math.max(0, intersectRight - intersectX);
        const intersectHeight = Math.max(0, intersectBottom - intersectY);

        let cropX = intersectX;
        let cropY = intersectY;
        let cropWidth = intersectWidth;
        let cropHeight = intersectHeight;
        cropX -= imageRect.x;
        cropY -= imageRect.y;

        if (cropWidth <= 0 || cropHeight <= 0) {
            return null;
        }
        const scaleX = naturalWidth / imageRect.width;
        const scaleY = naturalHeight / imageRect.height;

        cropX = Math.round(cropX * scaleX);
        cropY = Math.round(cropY * scaleY);
        cropWidth = Math.round(cropWidth * scaleX);
        cropHeight = Math.round(cropHeight * scaleY);


        const canvas = document.createElement("canvas");
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return null;
        }
        console.log("image natural size:", { naturalWidth, naturalHeight });
        console.log("Cropping image with:", { cropX, cropY, cropWidth, cropHeight });
        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        );

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((value) => resolve(value), "image/jpeg")
        );
        if (!blob) {
            return null;
        }
        return new File([blob], "ocr-crop.jpg", { type: "image/jpeg" });
    };

    const handleConfirm = async () => {
        const croppedFile = await createCroppedFile();
        await onConfirm(croppedFile);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="relative w-full max-w-3xl rounded-lg bg-[var(--surface)] p-4 shadow-lg">
                {isOcring && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/40">
                        <ProgressSpinner />
                        <p className="text-sm text-white">正在识别...</p>
                    </div>
                )}
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-medium">选择 OCR 区域</h3>
                    <Button
                        label="取消"
                        severity="secondary"
                        outlined
                        onClick={onCancel}
                        disabled={isOcring}
                    />
                </div>

                <div className="relative flex items-center justify-center overflow-hidden rounded border border-[var(--surface-border)] bg-black/5">
                    <img
                        ref={previewImageRef}
                        src={previewUrl}
                        alt="OCR 预览"
                        className="max-h-[70vh] w-auto select-none"
                        draggable={false}
                        onLoad={() => {
                            setSelection((current) => current ?? getDefaultSelection());
                        }}
                    />
                    <div
                        ref={previewOverlayRef}
                        className="absolute inset-0 cursor-crosshair"
                        onMouseDown={handlePreviewMouseDown}
                        onMouseMove={handlePreviewMouseMove}
                        onMouseUp={handlePreviewMouseUp}
                        onMouseLeave={handlePreviewMouseUp}
                    >
                        {selection && (
                            <>
                                <div
                                    className="absolute bg-black/40"
                                    style={{
                                        left: 0,
                                        top: 0,
                                        width: "100%",
                                        height: selection.y,
                                    }}
                                />
                                <div
                                    className="absolute bg-black/40"
                                    style={{
                                        left: 0,
                                        top: selection.y,
                                        width: selection.x,
                                        height: selection.height,
                                    }}
                                />
                                <div
                                    className="absolute bg-black/40"
                                    style={{
                                        left: selection.x + selection.width,
                                        top: selection.y,
                                        width: `calc(100% - ${selection.x + selection.width}px)`,
                                        height: selection.height,
                                    }}
                                />
                                <div
                                    className="absolute bg-black/40"
                                    style={{
                                        left: 0,
                                        top: selection.y + selection.height,
                                        width: "100%",
                                        height: `calc(100% - ${selection.y + selection.height}px)`,
                                    }}
                                />
                                <div
                                    className="absolute border-2 border-[var(--primary)] bg-transparent"
                                    style={{
                                        left: selection.x,
                                        top: selection.y,
                                        width: selection.width,
                                        height: selection.height,
                                    }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{ left: selection.x, top: selection.y }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{
                                        left: selection.x + selection.width / 2,
                                        top: selection.y,
                                    }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{ left: selection.x + selection.width, top: selection.y }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{
                                        left: selection.x,
                                        top: selection.y + selection.height / 2,
                                    }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{
                                        left: selection.x + selection.width,
                                        top: selection.y + selection.height / 2,
                                    }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{ left: selection.x, top: selection.y + selection.height }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{
                                        left: selection.x + selection.width / 2,
                                        top: selection.y + selection.height,
                                    }}
                                />
                                <div
                                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--primary)] bg-white"
                                    style={{
                                        left: selection.x + selection.width,
                                        top: selection.y + selection.height,
                                    }}
                                />
                            </>
                        )}
                    </div>

                </div>
                <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                        label={isOcring ? "识别中" : "确定"}
                        onClick={handleConfirm}
                        loading={isOcring}
                        disabled={isOcring}
                    />
                </div>
            </div>
        </div>
    );
}
