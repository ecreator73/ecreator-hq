import { getContext, ServiceError } from "./_helpers";
import { recordAudit } from "@/lib/activity";
import {
  articleInsertSchema,
  articleUpdateSchema,
  sopInsertSchema,
  sopUpdateSchema,
  promptLibraryInsertSchema,
  promptLibraryUpdateSchema,
  type ArticleCreateInput,
  type ArticleUpdateInput,
  type SopCreateInput,
  type SopUpdateInput,
  type PromptLibraryCreateInput,
  type PromptLibraryUpdateInput,
} from "@/lib/validation/knowledge";
import type {
  KnowledgeArticle,
  Sop,
  PromptLibraryItem,
  KnowledgeSearchResults,
} from "@/types/entities";

export interface ArticleFilters {
  category?: string;
  status?: string;
  search?: string;
}

export const knowledgeArticlesService = {
  async list(filters: ArticleFilters = {}): Promise<KnowledgeArticle[]> {
    const { supabase } = await getContext();
    let q = supabase.from("knowledge_articles").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      q = q.or(`title.ilike.${like},content.ilike.${like}`);
    }
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Artikel konnten nicht geladen werden", error);
    return (data ?? []) as unknown as KnowledgeArticle[];
  },
  async getById(id: string): Promise<KnowledgeArticle | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("knowledge_articles").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("Artikel konnte nicht geladen werden", error);
    return (data as unknown as KnowledgeArticle) ?? null;
  },
  async create(input: ArticleCreateInput): Promise<KnowledgeArticle> {
    const parsed = articleInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("knowledge_articles").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Artikel konnte nicht erstellt werden", error);
    const row = data as unknown as KnowledgeArticle;
    await recordAudit({ action: "create", entityType: "knowledge_article", entityId: row.id, newValues: row });
    return row;
  },
  async update(id: string, input: ArticleUpdateInput): Promise<KnowledgeArticle> {
    const parsed = articleUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("knowledge_articles").update(parsed).eq("id", id).is("deleted_at", null).select("*").single();
    if (error) throw new ServiceError("Artikel konnte nicht aktualisiert werden", error);
    return data as unknown as KnowledgeArticle;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("knowledge_articles").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new ServiceError("Artikel konnte nicht geloescht werden", error);
  },
};

export interface SopFilters {
  category?: string;
  status?: string;
  search?: string;
}

export const sopsService = {
  async list(filters: SopFilters = {}): Promise<Sop[]> {
    const { supabase } = await getContext();
    let q = supabase.from("sops").select("*").is("deleted_at", null).order("title", { ascending: true });
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.status) q = q.eq("status", filters.status);
    if (filters.search) q = q.ilike("title", `%${filters.search.trim()}%`);
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("SOPs konnten nicht geladen werden", error);
    return (data ?? []) as unknown as Sop[];
  },
  async getById(id: string): Promise<Sop | null> {
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("sops").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) throw new ServiceError("SOP konnte nicht geladen werden", error);
    return (data as unknown as Sop) ?? null;
  },
  async create(input: SopCreateInput): Promise<Sop> {
    const parsed = sopInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("sops").insert(parsed).select("*").single();
    if (error) throw new ServiceError("SOP konnte nicht erstellt werden", error);
    const row = data as unknown as Sop;
    await recordAudit({ action: "create", entityType: "sop", entityId: row.id, newValues: row });
    return row;
  },
  async update(id: string, input: SopUpdateInput): Promise<Sop> {
    const parsed = sopUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("sops").update(parsed).eq("id", id).is("deleted_at", null).select("*").single();
    if (error) throw new ServiceError("SOP konnte nicht aktualisiert werden", error);
    return data as unknown as Sop;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("sops").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new ServiceError("SOP konnte nicht geloescht werden", error);
  },
};

export interface PromptLibraryFilters {
  category?: string;
  search?: string;
}

export const promptLibraryService = {
  async list(filters: PromptLibraryFilters = {}): Promise<PromptLibraryItem[]> {
    const { supabase } = await getContext();
    let q = supabase.from("prompt_library").select("*").is("deleted_at", null).order("title", { ascending: true });
    if (filters.category) q = q.eq("category", filters.category);
    if (filters.search) {
      const like = `%${filters.search.trim()}%`;
      q = q.or(`title.ilike.${like},prompt.ilike.${like}`);
    }
    const { data, error } = await q.limit(500);
    if (error) throw new ServiceError("Prompts konnten nicht geladen werden", error);
    return (data ?? []) as unknown as PromptLibraryItem[];
  },
  async create(input: PromptLibraryCreateInput): Promise<PromptLibraryItem> {
    const parsed = promptLibraryInsertSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("prompt_library").insert(parsed).select("*").single();
    if (error) throw new ServiceError("Prompt konnte nicht erstellt werden", error);
    return data as unknown as PromptLibraryItem;
  },
  async update(id: string, input: PromptLibraryUpdateInput): Promise<PromptLibraryItem> {
    const parsed = promptLibraryUpdateSchema.parse(input);
    const { supabase } = await getContext();
    const { data, error } = await supabase.from("prompt_library").update(parsed).eq("id", id).is("deleted_at", null).select("*").single();
    if (error) throw new ServiceError("Prompt konnte nicht aktualisiert werden", error);
    return data as unknown as PromptLibraryItem;
  },
  async remove(id: string): Promise<void> {
    const { supabase } = await getContext();
    const { error } = await supabase.from("prompt_library").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new ServiceError("Prompt konnte nicht geloescht werden", error);
  },
};

export const knowledgeSearchService = {
  /** Globale Suche ueber Meetings, Artikel, SOPs und Prompts. */
  async search(query: string): Promise<KnowledgeSearchResults> {
    const empty: KnowledgeSearchResults = { meetings: [], articles: [], sops: [], prompts: [] };
    const term = query.trim();
    if (!term) return empty;
    const like = `%${term}%`;
    const { supabase } = await getContext();
    const [m, a, s, p] = await Promise.all([
      supabase.from("meetings").select("id,title,meeting_date").is("deleted_at", null).or(`title.ilike.${like},summary.ilike.${like},notes.ilike.${like}`).limit(10),
      supabase.from("knowledge_articles").select("id,title,category").is("deleted_at", null).or(`title.ilike.${like},content.ilike.${like}`).limit(10),
      supabase.from("sops").select("id,title,category").is("deleted_at", null).ilike("title", like).limit(10),
      supabase.from("prompt_library").select("id,title,category").is("deleted_at", null).or(`title.ilike.${like},prompt.ilike.${like}`).limit(10),
    ]);
    return {
      meetings: (m.data ?? []) as KnowledgeSearchResults["meetings"],
      articles: (a.data ?? []) as KnowledgeSearchResults["articles"],
      sops: (s.data ?? []) as KnowledgeSearchResults["sops"],
      prompts: (p.data ?? []) as KnowledgeSearchResults["prompts"],
    };
  },
};
