import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";

function AvatarEditor({ image, onCancel, onSave }) {
    if (!image) return null;

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [loading, setLoading] = useState(false);

    const onCropComplete = useCallback((_, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });

    const getCroppedImage = async () => {
        if (!croppedAreaPixels) return;

        try {
            setLoading(true);

            const img = await createImage(image);

            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const size = 500;
            canvas.width = size;
            canvas.height = size;

            ctx.drawImage(
                img,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                size,
                size
            );

            const base64 = canvas.toDataURL("image/jpeg", 0.85);

            onSave(base64);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="avatar-modal-overlay">
            <div className="avatar-modal">

                {/* ZONA CROP */}
                <div style={{ position: "relative", width: 300, height: 300 }}>
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>

                {/* ZOOM */}
                <div style={{ marginTop: 10 }}>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                    />
                </div>

                {/* BOTONES */}
                <div className="avatar-buttons">
                    <button onClick={onCancel} disabled={loading}>
                        Cancelar
                    </button>

                    <button onClick={getCroppedImage} disabled={loading || !croppedAreaPixels}>
                        {loading ? "Guardando..." : "Guardar"}
                    </button>
                </div>

            </div>
        </div>
    );
}

export default AvatarEditor;