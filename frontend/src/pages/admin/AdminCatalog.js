import { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Star, Upload, RotateCcw, AlertCircle, CheckCircle2, Eye, Image as ImageIcon } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";

export default function AdminCatalog() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-navy-900 mb-4">Catalog Management</h1>
      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" data-testid="cat-tab-products">Products</TabsTrigger>
          <TabsTrigger value="cas" data-testid="cat-tab-cas">Certifying Authorities</TabsTrigger>
          <TabsTrigger value="faqs" data-testid="cat-tab-faqs">FAQs</TabsTrigger>
          <TabsTrigger value="coupons" data-testid="cat-tab-coupons">Coupons</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><Products /></TabsContent>
        <TabsContent value="cas" className="mt-4"><CAs /></TabsContent>
        <TabsContent value="faqs" className="mt-4"><FAQs /></TabsContent>
        <TabsContent value="coupons" className="mt-4"><Coupons /></TabsContent>
      </Tabs>
    </div>
  );
}

function Products() {
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);

  // Image 1: Product Card Frame (5:4)
  const [cardStagedFile, setCardStagedFile] = useState(null);
  const [cardStagedPreview, setCardStagedPreview] = useState("");
  const [cardOriginalImage, setCardOriginalImage] = useState("");
  const [cardImageWarning, setCardImageWarning] = useState("");
  const [cardIsDragging, setCardIsDragging] = useState(false);
  const cardFileInputRef = useRef(null);

  // Image 2: Product Details Frame (1:1 Square)
  const [detailsStagedFile, setDetailsStagedFile] = useState(null);
  const [detailsStagedPreview, setDetailsStagedPreview] = useState("");
  const [detailsOriginalImage, setDetailsOriginalImage] = useState("");
  const [detailsImageWarning, setDetailsImageWarning] = useState("");
  const [detailsIsDragging, setDetailsIsDragging] = useState(false);
  const detailsFileInputRef = useRef(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => setItems((await api.get("/admin/products")).data), []);
  useEffect(() => { load(); }, [load]);

  const cleanupImagePreviews = () => {
    if (cardStagedPreview) URL.revokeObjectURL(cardStagedPreview);
    if (detailsStagedPreview) URL.revokeObjectURL(detailsStagedPreview);
    setCardStagedFile(null);
    setCardStagedPreview("");
    setCardOriginalImage("");
    setCardImageWarning("");
    setDetailsStagedFile(null);
    setDetailsStagedPreview("");
    setDetailsOriginalImage("");
    setDetailsImageWarning("");
  };

  // ----- Frame 1: Product Card Image Handler (5:4) -----
  const handleCardImageFile = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5 MB limit. Please select a smaller image.");
      return;
    }
    if (cardStagedPreview) URL.revokeObjectURL(cardStagedPreview);
    const previewUrl = URL.createObjectURL(file);
    setCardStagedFile(file);
    setCardStagedPreview(previewUrl);

    // Dimension check: Recommended 1200x960 (5:4), Min 600x480
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w < 600 || h < 480) {
        setCardImageWarning(`Image is ${w} × ${h} px (recommended minimum: 600 × 480 px for 5:4 ratio). It will be fitted responsively.`);
      } else {
        setCardImageWarning("");
      }
    };
    img.src = previewUrl;
    toast.success("Product Card image selected! Preview updated.");
  };

  const handleCardDrop = (e) => {
    e.preventDefault();
    setCardIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCardImageFile(e.dataTransfer.files[0]);
    }
  };
  const handleCardDragOver = (e) => { e.preventDefault(); setCardIsDragging(true); };
  const handleCardDragLeave = () => { setCardIsDragging(false); };

  const handleRevertCardImage = () => {
    if (cardStagedPreview) URL.revokeObjectURL(cardStagedPreview);
    setCardStagedFile(null);
    setCardStagedPreview("");
    setCardImageWarning("");
    setEdit((prev) => ({ ...prev, product_card_image: cardOriginalImage }));
    toast.info("Reverted Product Card image to original");
  };

  const handleRemoveCardImage = () => {
    if (window.confirm("Remove Product Card image? A standard fallback will be used.")) {
      if (cardStagedPreview) URL.revokeObjectURL(cardStagedPreview);
      setCardStagedFile(null);
      setCardStagedPreview("");
      setCardImageWarning("");
      setEdit((prev) => ({ ...prev, product_card_image: "" }));
      toast.info("Product Card image removed");
    }
  };

  // ----- Frame 2: Product Details Image Handler (1:1 Square) -----
  const handleDetailsImageFile = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file format. Please upload JPG, PNG, or WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5 MB limit. Please select a smaller image.");
      return;
    }
    if (detailsStagedPreview) URL.revokeObjectURL(detailsStagedPreview);
    const previewUrl = URL.createObjectURL(file);
    setDetailsStagedFile(file);
    setDetailsStagedPreview(previewUrl);

    // Dimension check: Recommended 1200x1200 (1:1), Min 600x600
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (w < 600 || h < 600) {
        setDetailsImageWarning(`Image is ${w} × ${h} px (recommended minimum: 600 × 600 px for 1:1 square). It will be fitted responsively.`);
      } else {
        setDetailsImageWarning("");
      }
    };
    img.src = previewUrl;
    toast.success("Product Details image selected! Preview updated.");
  };

  const handleDetailsDrop = (e) => {
    e.preventDefault();
    setDetailsIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleDetailsImageFile(e.dataTransfer.files[0]);
    }
  };
  const handleDetailsDragOver = (e) => { e.preventDefault(); setDetailsIsDragging(true); };
  const handleDetailsDragLeave = () => { setDetailsIsDragging(false); };

  const handleRevertDetailsImage = () => {
    if (detailsStagedPreview) URL.revokeObjectURL(detailsStagedPreview);
    setDetailsStagedFile(null);
    setDetailsStagedPreview("");
    setDetailsImageWarning("");
    setEdit((prev) => ({ ...prev, product_details_image: detailsOriginalImage }));
    toast.info("Reverted Product Details image to original");
  };

  const handleRemoveDetailsImage = () => {
    if (window.confirm("Remove Product Details image? A standard fallback will be used.")) {
      if (detailsStagedPreview) URL.revokeObjectURL(detailsStagedPreview);
      setDetailsStagedFile(null);
      setDetailsStagedPreview("");
      setDetailsImageWarning("");
      setEdit((prev) => ({ ...prev, product_details_image: "" }));
      toast.info("Product Details image removed");
    }
  };

  const save = async (p) => {
    try {
      setUploadingImage(true);
      let finalCardUrl = p.product_card_image || p.imageUrl || "";
      let finalCardWebpUrl = p.product_card_image_webp || p.imageWebpUrl || "";
      let finalDetailsUrl = p.product_details_image || p.imageUrl || "";
      let finalDetailsWebpUrl = p.product_details_image_webp || p.imageWebpUrl || "";

      // 1. Upload newly staged Card Image (5:4) if selected
      if (cardStagedFile) {
        toast.loading("Uploading Product Card image (5:4)...", { id: "card-upload" });
        const formData = new FormData();
        formData.append("file", cardStagedFile);
        formData.append("frame_type", "card");
        const { data } = await api.post("/admin/products/upload-image?frame=card", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalCardUrl = data.imageUrl;
        finalCardWebpUrl = data.imageWebpUrl;
        toast.dismiss("card-upload");
      }

      // 2. Upload newly staged Details Image (1:1) if selected
      if (detailsStagedFile) {
        toast.loading("Uploading Product Details image (1:1)...", { id: "details-upload" });
        const formData = new FormData();
        formData.append("file", detailsStagedFile);
        formData.append("frame_type", "details");
        const { data } = await api.post("/admin/products/upload-image?frame=details", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalDetailsUrl = data.imageUrl;
        finalDetailsWebpUrl = data.imageWebpUrl;
        toast.dismiss("details-upload");
      }

      // Fallback: If only one frame image exists, use it as fallback for the other
      if (!finalCardUrl && finalDetailsUrl) finalCardUrl = finalDetailsUrl;
      if (!finalDetailsUrl && finalCardUrl) finalDetailsUrl = finalCardUrl;

      const body = {
        ...p,
        product_card_image: finalCardUrl,
        productCardImage: finalCardUrl,
        product_card_image_webp: finalCardWebpUrl,
        product_details_image: finalDetailsUrl,
        productDetailsImage: finalDetailsUrl,
        product_details_image_webp: finalDetailsWebpUrl,
        imageUrl: finalCardUrl || finalDetailsUrl || p.imageUrl || "",
        imageWebpUrl: finalCardWebpUrl || finalDetailsWebpUrl || p.imageWebpUrl || "",
        price: Number(p.price),
        isPopular: Boolean(p.isPopular),
        rating: Number(p.rating || 5),
        badgeText: p.badgeText || "Most Popular",
        features: (p.featuresStr || "").split(",").map((s) => s.trim()).filter(Boolean),
        requiredDocuments: (p.docsStr || "").split(",").map((s) => s.trim()).filter(Boolean)
      };

      if (p.id) {
        try {
          await api.put(`/admin/products/${p.id}`, body);
        } catch (err) {
          if (err.response?.status === 405 || err.response?.status === 404) {
            try {
              await api.post(`/admin/products/${p.id}`, body);
            } catch (err2) {
              await api.put("/admin/products", body);
            }
          } else {
            throw err;
          }
        }
      } else {
        await api.post("/admin/products", body);
      }
      toast.success("Product and both frame images saved successfully!");
      cleanupImagePreviews();
      setEdit(null);
      load();
    } catch (e) {
      toast.dismiss("card-upload");
      toast.dismiss("details-upload");
      console.error("[Save Product Error]:", e);
      toast.error(e.response?.data?.detail || "Failed to save product");
    } finally {
      setUploadingImage(false);
    }
  };

  const del = async (id) => {
    if (window.confirm("Delete product?")) {
      await api.delete(`/admin/products/${id}`);
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div>
      <Button
        data-testid="add-product"
        onClick={() => {
          cleanupImagePreviews();
          setEdit({
            name: "",
            category: "Class 3 DSC",
            slug: "",
            description: "",
            price: 0,
            validity: "1 Year",
            product_card_image: "",
            product_details_image: "",
            imageUrl: "",
            isPopular: false,
            rating: 5,
            badgeText: "Most Popular",
            featuresStr: "",
            docsStr: "",
            active: true
          });
        }}
        className="mb-4 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"
      >
        <Plus className="h-4 w-4 mr-1" /> Add Product
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border bg-white p-4 transition-all ${
              p.isPopular ? "border-amber-300 ring-2 ring-amber-300/30 shadow-md" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-purple-100 bg-purple-50/60 p-1 flex items-center justify-center">
                <ProductImage
                  src={p.product_card_image || p.productCardImage || p.imageUrl}
                  alt={p.name}
                  variant="thumbnail"
                  className="!w-12 !h-12 !max-w-12 !max-h-12 mix-blend-multiply"
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-xs text-purple-600 font-semibold truncate">{p.category}</span>
                  <span className="font-bold text-navy-900 shrink-0 text-sm">₹{p.price}</span>
                </div>
                <p className="mt-0.5 font-semibold text-navy-900 text-sm truncate" title={p.name}>{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-400">{p.active !== false ? "Active" : "Disabled"} · {p.validity}</span>
                  {p.isPopular && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> {p.badgeText || "Most Popular"} ({p.rating || 5}★)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                data-testid={`edit-product-${p.id}`}
                onClick={() => {
                  const cardImg = p.product_card_image || p.productCardImage || p.imageUrl || "";
                  const detailsImg = p.product_details_image || p.productDetailsImage || p.imageUrl || "";
                  setCardOriginalImage(cardImg);
                  setDetailsOriginalImage(detailsImg);
                  setCardStagedFile(null);
                  setCardStagedPreview("");
                  setCardImageWarning("");
                  setDetailsStagedFile(null);
                  setDetailsStagedPreview("");
                  setDetailsImageWarning("");
                  setEdit({
                    ...p,
                    product_card_image: cardImg,
                    product_details_image: detailsImg,
                    isPopular: Boolean(p.isPopular),
                    rating: p.rating ?? 5,
                    badgeText: p.badgeText || "Most Popular",
                    featuresStr: (p.features || []).join(", "),
                    docsStr: (p.requiredDocuments || []).join(", ")
                  });
                }}
                className="rounded-lg flex-1"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => del(p.id)} className="rounded-lg text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!o) {
            cleanupImagePreviews();
            setEdit(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-4">
              {[
                ["name", "Product Name"],
                ["slug", "URL Slug"],
                ["category", "Category"],
                ["validity", "Validity (e.g. 1 Year, 2 Years)"]
              ].map(([k, l]) => (
                <div key={k}>
                  <Label className="text-xs">{l}</Label>
                  <Input
                    data-testid={`product-${k}`}
                    value={edit[k] || ""}
                    onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}
                    className="mt-1"
                  />
                </div>
              ))}

              {/* Universal Dual Product Image Management (5:4 Card & 1:1 Details) */}
              <div className="rounded-2xl border border-purple-200/90 bg-purple-50/20 p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-navy-900">
                        Dual Product Image Management
                      </Label>
                      <p className="text-[11px] text-slate-500">
                        Independent responsive frames: 5:4 for Cards & Listings, 1:1 Square for Product Details
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2 Separate Image Upload Cards (Side-by-Side on Desktop, Stacked on Mobile) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  
                  {/* UPLOAD CARD 1: Product Card Frame (5:4) */}
                  <div className="flex flex-col rounded-2xl border-2 border-purple-200 bg-white p-3.5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-700 text-xs font-black shrink-0">
                          1
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-navy-900 truncate">Product Card Frame</h4>
                          <p className="text-[10px] text-slate-500 truncate">Cards, grids, search & homepage</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                        5:4 Ratio
                      </span>
                    </div>

                    {/* Specification Box */}
                    <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-2.5 text-[11px] text-purple-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-purple-600 shrink-0" />
                        Recommended: 1200 × 960 px (5:4)
                      </p>
                      <div className="flex flex-wrap gap-1 text-[10px] text-purple-700 font-medium">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-purple-200/60">Min: 600×480 px</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-purple-200/60">Max: 5 MB</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-purple-200/60">JPG, PNG, WebP</span>
                      </div>
                    </div>

                    {/* Warning if any */}
                    {cardImageWarning && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{cardImageWarning}</span>
                      </div>
                    )}

                    {/* Live 5:4 Preview Box */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <Eye className="h-3 w-3 text-purple-600" /> Live 5:4 Preview
                        </span>
                        {cardStagedFile ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            New Image Staged
                          </span>
                        ) : edit.product_card_image ? (
                          <span className="text-[10px] font-medium text-slate-500">Custom Image</span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Default Fallback</span>
                        )}
                      </div>
                      <div className="overflow-hidden rounded-lg bg-white shadow-2xs">
                        <ProductImage
                          src={cardStagedPreview || edit.product_card_image || edit.imageUrl || "/img/epass2003-token.png"}
                          variant="card"
                          alt={edit.name || "Card Preview"}
                        />
                      </div>
                    </div>

                    {/* Drag & Drop Upload Zone */}
                    <div
                      onDrop={handleCardDrop}
                      onDragOver={handleCardDragOver}
                      onDragLeave={handleCardDragLeave}
                      onClick={() => cardFileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-3.5 text-center transition-all ${
                        cardIsDragging
                          ? "border-purple-600 bg-purple-100/60 scale-[1.01]"
                          : "border-slate-300 bg-slate-50/40 hover:border-purple-400 hover:bg-purple-50/20"
                      }`}
                    >
                      <input
                        ref={cardFileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleCardImageFile(e.target.files[0]);
                            e.target.value = "";
                          }
                        }}
                      />
                      <Upload className="mx-auto h-5 w-5 text-purple-600 mb-1" />
                      <p className="text-xs font-semibold text-navy-900">
                        Drag & drop 5:4 image, or <span className="text-purple-600 underline">browse file</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, JPEG, PNG, or WebP (max 5 MB)</p>
                    </div>

                    {/* Action Buttons: Replace, Revert, Remove */}
                    <div className="flex items-center gap-1.5 pt-1 mt-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => cardFileInputRef.current?.click()}
                        className="flex-1 h-8 text-xs rounded-lg text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        <Upload className="h-3 w-3 mr-1" /> Replace Image
                      </Button>
                      {(cardStagedFile || (edit.product_card_image && edit.product_card_image !== cardOriginalImage)) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleRevertCardImage}
                          className="h-8 text-xs rounded-lg text-slate-600 hover:text-navy-900"
                          title="Revert to original saved image"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Revert
                        </Button>
                      )}
                      {(cardStagedFile || edit.product_card_image) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleRemoveCardImage}
                          className="h-8 text-xs rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Remove card image"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>

                    {/* Manual URL Input */}
                    <div className="pt-1">
                      <Label className="text-[10px] font-medium text-slate-500">Manual Card Image URL:</Label>
                      <Input
                        value={edit.product_card_image || ""}
                        onChange={(e) => {
                          if (cardStagedPreview) URL.revokeObjectURL(cardStagedPreview);
                          setCardStagedFile(null);
                          setCardStagedPreview("");
                          setEdit({ ...edit, product_card_image: e.target.value });
                        }}
                        placeholder="/img/epass2003-token.png or https://..."
                        className="mt-0.5 h-7 text-[11px] font-mono bg-white"
                      />
                    </div>
                  </div>

                  {/* UPLOAD CARD 2: Product Details Frame (1:1) */}
                  <div className="flex flex-col rounded-2xl border-2 border-indigo-200 bg-white p-3.5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-700 text-xs font-black shrink-0">
                          2
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-navy-900 truncate">Product Details Frame</h4>
                          <p className="text-[10px] text-slate-500 truncate">Product page, showcase & zoom gallery</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full">
                        1:1 Square
                      </span>
                    </div>

                    {/* Specification Box */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-2.5 text-[11px] text-indigo-900 space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-indigo-600 shrink-0" />
                        Recommended: 1200 × 1200 px (1:1)
                      </p>
                      <div className="flex flex-wrap gap-1 text-[10px] text-indigo-700 font-medium">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-indigo-200/60">Min: 600×600 px</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-indigo-200/60">Max: 5 MB</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-indigo-200/60">JPG, PNG, WebP</span>
                      </div>
                    </div>

                    {/* Warning if any */}
                    {detailsImageWarning && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{detailsImageWarning}</span>
                      </div>
                    )}

                    {/* Live 1:1 Preview Box */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600 flex items-center gap-1">
                          <Eye className="h-3 w-3 text-indigo-600" /> Live 1:1 Preview
                        </span>
                        {detailsStagedFile ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            New Image Staged
                          </span>
                        ) : edit.product_details_image ? (
                          <span className="text-[10px] font-medium text-slate-500">Custom Image</span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Default Fallback</span>
                        )}
                      </div>
                      <div className="overflow-hidden rounded-lg bg-white shadow-2xs max-w-[240px] mx-auto w-full">
                        <ProductImage
                          src={detailsStagedPreview || edit.product_details_image || edit.imageUrl || "/img/epass2003-token.png"}
                          variant="detail"
                          alt={edit.name || "Details Preview"}
                        />
                      </div>
                    </div>

                    {/* Drag & Drop Upload Zone */}
                    <div
                      onDrop={handleDetailsDrop}
                      onDragOver={handleDetailsDragOver}
                      onDragLeave={handleDetailsDragLeave}
                      onClick={() => detailsFileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-3.5 text-center transition-all ${
                        detailsIsDragging
                          ? "border-indigo-600 bg-indigo-100/60 scale-[1.01]"
                          : "border-slate-300 bg-slate-50/40 hover:border-indigo-400 hover:bg-indigo-50/20"
                      }`}
                    >
                      <input
                        ref={detailsFileInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleDetailsImageFile(e.target.files[0]);
                            e.target.value = "";
                          }
                        }}
                      />
                      <Upload className="mx-auto h-5 w-5 text-indigo-600 mb-1" />
                      <p className="text-xs font-semibold text-navy-900">
                        Drag & drop 1:1 image, or <span className="text-indigo-600 underline">browse file</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, JPEG, PNG, or WebP (max 5 MB)</p>
                    </div>

                    {/* Action Buttons: Replace, Revert, Remove */}
                    <div className="flex items-center gap-1.5 pt-1 mt-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => detailsFileInputRef.current?.click()}
                        className="flex-1 h-8 text-xs rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Upload className="h-3 w-3 mr-1" /> Replace Image
                      </Button>
                      {(detailsStagedFile || (edit.product_details_image && edit.product_details_image !== detailsOriginalImage)) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleRevertDetailsImage}
                          className="h-8 text-xs rounded-lg text-slate-600 hover:text-navy-900"
                          title="Revert to original saved image"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Revert
                        </Button>
                      )}
                      {(detailsStagedFile || edit.product_details_image) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleRemoveDetailsImage}
                          className="h-8 text-xs rounded-lg text-rose-600 hover:bg-rose-50"
                          title="Remove details image"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>

                    {/* Manual URL Input */}
                    <div className="pt-1">
                      <Label className="text-[10px] font-medium text-slate-500">Manual Details Image URL:</Label>
                      <Input
                        value={edit.product_details_image || ""}
                        onChange={(e) => {
                          if (detailsStagedPreview) URL.revokeObjectURL(detailsStagedPreview);
                          setDetailsStagedFile(null);
                          setDetailsStagedPreview("");
                          setEdit({ ...edit, product_details_image: e.target.value });
                        }}
                        placeholder="/img/epass2003-token.png or https://..."
                        className="mt-0.5 h-7 text-[11px] font-mono bg-white"
                      />
                    </div>
                  </div>

                </div>

                {/* Quick Pick Standard DSC Token Model Presets for Both Frames */}
                <div className="space-y-1.5 pt-2 border-t border-purple-100">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-slate-600 font-semibold">
                      Or Quick Pick Standard DSC Token Model (Applies to both frames):
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "ePass2003 (Purple)", url: "/img/epass2003-token.png" },
                      { label: "PROXKey (Black)", url: "/img/proxkey-token.png" },
                      { label: "mToken (Blue)", url: "/img/mtoken-blue.png" },
                      { label: "mToken (Purple)", url: "/img/mtoken-purple.png" },
                      { label: "Innait (Signer)", url: "/img/innait-token.png" },
                      { label: "Blue Token (Org)", url: "/img/blue-token.png" },
                    ].map((tok) => (
                      <button
                        key={tok.url}
                        type="button"
                        onClick={() => {
                          if (cardStagedPreview) URL.revokeObjectURL(cardStagedPreview);
                          if (detailsStagedPreview) URL.revokeObjectURL(detailsStagedPreview);
                          setCardStagedFile(null);
                          setCardStagedPreview("");
                          setCardImageWarning("");
                          setDetailsStagedFile(null);
                          setDetailsStagedPreview("");
                          setDetailsImageWarning("");
                          setEdit({
                            ...edit,
                            product_card_image: tok.url,
                            product_details_image: tok.url,
                            imageUrl: tok.url,
                          });
                        }}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
                          (edit.product_card_image === tok.url || edit.product_details_image === tok.url) && !cardStagedFile && !detailsStagedFile
                            ? "bg-purple-100 border-purple-400 text-purple-900 ring-1 ring-purple-300"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-purple-50"
                        }`}
                      >
                        {tok.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Price (₹)</Label>
                <Input
                  data-testid="product-price"
                  type="number"
                  value={edit.price}
                  onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                  className="mt-1"
                />
              </div>

              {/* Popularity & Star Rating Section */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-navy-900 cursor-pointer">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
                    <span>Mark as Most Popular / Featured</span>
                  </label>
                  <Switch
                    checked={Boolean(edit.isPopular)}
                    onCheckedChange={(v) => setEdit({ ...edit, isPopular: v })}
                  />
                </div>

                {edit.isPopular && (
                  <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Star Rating ({edit.rating || 5} Stars)</Label>
                      <div className="flex items-center gap-1 mt-1 bg-white p-1.5 rounded-lg border border-slate-200">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setEdit({ ...edit, rating: star })}
                            className="p-1 focus:outline-none transition-transform hover:scale-125"
                            title={`${star} Star`}
                          >
                            <Star
                              className={`h-5 w-5 ${
                                star <= (edit.rating || 5)
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-slate-100 text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-800 ml-1.5">{edit.rating || 5}★</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] font-semibold text-slate-700">Badge Label</Label>
                      <Input
                        placeholder="e.g. Most Popular"
                        value={edit.badgeText ?? "Most Popular"}
                        onChange={(e) => setEdit({ ...edit, badgeText: e.target.value })}
                        className="mt-1 h-9 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  value={edit.description || ""}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Features (comma separated)</Label>
                <Input
                  value={edit.featuresStr}
                  onChange={(e) => setEdit({ ...edit, featuresStr: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Required Documents (comma separated)</Label>
                <Input
                  value={edit.docsStr}
                  onChange={(e) => setEdit({ ...edit, docsStr: e.target.value })}
                  className="mt-1"
                />
              </div>

              <label className="flex items-center gap-2 text-sm pt-1">
                <Switch
                  checked={edit.active !== false}
                  onCheckedChange={(v) => setEdit({ ...edit, active: v })}
                />
                Active (Visible in Store)
              </label>

              <Button
                data-testid="save-product"
                disabled={uploadingImage}
                onClick={() => save(edit)}
                className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl py-6 font-semibold"
              >
                {uploadingImage ? "Saving Product & Image..." : "Save Product"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CAs() {
  const [items, setItems] = useState([]);
  const load = useCallback(async () => setItems((await api.get("/admin/cas")).data), []);
  useEffect(() => { load(); }, [load]);
  const add = async () => { const name = prompt("CA name?"); if (!name) return; await api.post("/admin/cas", { name }); load(); };
  const toggle = async (c) => { await api.put(`/admin/cas/${c.id}`, { active: !c.active }); load(); };
  const del = async (id) => { if (window.confirm("Delete CA?")) { await api.delete(`/admin/cas/${id}`); load(); } };
  return (
    <div>
      <Button data-testid="add-ca" onClick={add} className="mb-4 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"><Plus className="h-4 w-4 mr-1" /> Add CA</Button>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 text-center">
            <p className="font-semibold text-navy-900 text-sm">{c.name}</p>
            <label className="mt-2 flex items-center justify-center gap-2 text-xs"><Switch checked={c.active} onCheckedChange={() => toggle(c)} /> {c.active ? "Active" : "Off"}</label>
            <button onClick={() => del(c.id)} className="mt-2 text-xs text-rose-500">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FAQs() {
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = useCallback(async () => setItems((await api.get("/admin/faqs")).data), []);
  useEffect(() => { load(); }, [load]);
  const save = async () => { if (edit.id) await api.put(`/admin/faqs/${edit.id}`, edit); else await api.post("/admin/faqs", edit); setEdit(null); load(); };
  const del = async (id) => { if (window.confirm("Delete FAQ?")) { await api.delete(`/admin/faqs/${id}`); load(); } };
  return (
    <div>
      <Button data-testid="add-faq" onClick={() => setEdit({ question: "", answer: "", sortOrder: 99 })} className="mb-4 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"><Plus className="h-4 w-4 mr-1" /> Add FAQ</Button>
      <div className="space-y-2">{items.map((f) => (
        <div key={f.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-3">
          <div><p className="font-medium text-navy-900 text-sm">{f.question}</p><p className="text-xs text-slate-400 line-clamp-1">{f.answer}</p></div>
          <div className="flex gap-1 shrink-0"><Button size="sm" variant="outline" onClick={() => setEdit(f)} className="rounded-lg h-8"><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="outline" onClick={() => del(f.id)} className="rounded-lg h-8 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button></div>
        </div>
      ))}</div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} FAQ</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3"><div><Label className="text-xs">Question</Label><Input value={edit.question} onChange={(e) => setEdit({ ...edit, question: e.target.value })} className="mt-1" /></div><div><Label className="text-xs">Answer</Label><Textarea value={edit.answer} onChange={(e) => setEdit({ ...edit, answer: e.target.value })} className="mt-1" /></div><Button data-testid="save-faq" onClick={save} className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Save</Button></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Coupons() {
  const [items, setItems] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = useCallback(async () => setItems((await api.get("/admin/coupons")).data), []);
  useEffect(() => { load(); }, [load]);
  const save = async () => { const body = { ...edit, value: Number(edit.value), minOrderValue: Number(edit.minOrderValue||0) }; if (edit.id) await api.put(`/admin/coupons/${edit.id}`, body); else await api.post("/admin/coupons", body); setEdit(null); load(); toast.success("Saved"); };
  const del = async (id) => { if (window.confirm("Delete coupon?")) { await api.delete(`/admin/coupons/${id}`); load(); } };
  return (
    <div>
      <Button data-testid="add-coupon" onClick={() => setEdit({ code: "", discountType: "percentage", value: 10, perCustomerLimit: 1, minOrderValue: 0, active: true })} className="mb-4 bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl"><Plus className="h-4 w-4 mr-1" /> Add Coupon</Button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{items.map((c) => (
        <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-mono font-bold text-purple-700">{c.code}</p>
          <p className="text-sm text-navy-800">{c.discountType === "percentage" ? `${c.value}% off` : `₹${c.value} off`}</p>
          <p className="text-xs text-slate-400">Used {c.usedCount} · {c.active ? "Active" : "Off"}</p>
          <div className="mt-2 flex gap-1"><Button size="sm" variant="outline" onClick={() => setEdit(c)} className="rounded-lg h-8 flex-1"><Pencil className="h-3.5 w-3.5" /></Button><Button size="sm" variant="outline" onClick={() => del(c.id)} className="rounded-lg h-8 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button></div>
        </div>
      ))}</div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} Coupon</DialogTitle></DialogHeader>
          {edit && <div className="space-y-3">
            <div><Label className="text-xs">Code</Label><Input data-testid="coupon-code" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Type</Label><select className="mt-1 w-full h-10 rounded-md border px-2 text-sm" value={edit.discountType} onChange={(e) => setEdit({ ...edit, discountType: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed ₹</option></select></div>
              <div><Label className="text-xs">Value</Label><Input data-testid="coupon-value" type="number" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} className="mt-1" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /> Active</label>
            <Button data-testid="save-coupon" onClick={save} className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl">Save</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
