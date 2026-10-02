import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Star } from "lucide-react";

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
  const load = useCallback(async () => setItems((await api.get("/admin/products")).data), []);
  useEffect(() => { load(); }, [load]);

  const save = async (p) => {
    const body = {
      ...p,
      price: Number(p.price),
      isPopular: Boolean(p.isPopular),
      rating: Number(p.rating || 5),
      badgeText: p.badgeText || "Most Popular",
      features: (p.featuresStr || "").split(",").map((s) => s.trim()).filter(Boolean),
      requiredDocuments: (p.docsStr || "").split(",").map((s) => s.trim()).filter(Boolean)
    };
    if (p.id) await api.put(`/admin/products/${p.id}`, body);
    else await api.post("/admin/products", body);
    toast.success("Saved");
    setEdit(null);
    load();
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
        onClick={() => setEdit({
          name: "",
          category: "Class 3 DSC",
          slug: "",
          description: "",
          price: 0,
          validity: "1 Year",
          imageUrl: "",
          isPopular: false,
          rating: 5,
          badgeText: "Most Popular",
          featuresStr: "",
          docsStr: "",
          active: true
        })}
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
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-purple-600 font-semibold">{p.category}</span>
                {p.isPopular && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> {p.badgeText || "Most Popular"} ({p.rating || 5}★)
                  </span>
                )}
              </div>
              <span className="font-bold text-navy-900">₹{p.price}</span>
            </div>

            <p className="mt-1 font-semibold text-navy-900">{p.name}</p>
            <p className="text-xs text-slate-400">{p.active !== false ? "Active" : "Disabled"} · {p.validity}</p>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                data-testid={`edit-product-${p.id}`}
                onClick={() => setEdit({
                  ...p,
                  isPopular: Boolean(p.isPopular),
                  rating: p.rating ?? 5,
                  badgeText: p.badgeText || "Most Popular",
                  featuresStr: (p.features || []).join(", "),
                  docsStr: (p.requiredDocuments || []).join(", ")
                })}
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

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit" : "Add"} Product</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3.5">
              {[
                ["name", "Product Name"],
                ["slug", "URL Slug"],
                ["category", "Category"],
                ["validity", "Validity (e.g. 1 Year, 2 Years)"],
                ["imageUrl", "Image URL"]
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
                onClick={() => save(edit)}
                className="w-full bg-gradient-to-r from-purple-700 to-navy-800 text-white rounded-xl py-6 font-semibold"
              >
                Save Product
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
