"use client";

import { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { usePapers } from "../papers-context";

type NewPaperDialogProps = {
    nextIndex: number;
};

export default function NewPaperDialog({ nextIndex }: NewPaperDialogProps) {
    const { addPaper } = usePapers();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [paperTitle, setPaperTitle] = useState("");
    const [paperDescription, setPaperDescription] = useState("");
    const [dialogError, setDialogError] = useState("");

    const openDialog = () => {
        setPaperTitle(`新建试卷 ${nextIndex}`);
        setPaperDescription("");
        setDialogError("");
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
    };

    const handleAddPaper = () => {
        if (!paperTitle.trim()) {
            setDialogError("请填写试卷标题");
            return;
        }
        addPaper({
            title: paperTitle.trim(),
            description: paperDescription.trim(),
        });
        setIsDialogOpen(false);
    };

    return (
        <>
            <Button label="添加试卷" icon="pi pi-plus" onClick={openDialog} />
            <Dialog
                header="新增试卷"
                visible={isDialogOpen}
                onHide={closeDialog}
                className="w-full max-w-lg"
            >
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="mb-2 block text-sm">试卷标题</label>
                        <InputText
                            value={paperTitle}
                            onChange={(event) => setPaperTitle(event.target.value)}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-sm">试卷描述</label>
                        <InputTextarea
                            value={paperDescription}
                            onChange={(event) => setPaperDescription(event.target.value)}
                            className="w-full"
                            rows={4}
                        />
                    </div>
                    {dialogError && <p className="text-sm text-red-400">{dialogError}</p>}
                    <div className="flex justify-end gap-2">
                        <Button label="取消" severity="secondary" outlined onClick={closeDialog} />
                        <Button label="创建" icon="pi pi-check" onClick={handleAddPaper} />
                    </div>
                </div>
            </Dialog>
        </>
    );
}
