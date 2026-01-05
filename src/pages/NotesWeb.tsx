import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Calendar, Tag, Edit, Trash2, Play } from "lucide-react";
import { Header } from "@/components/Header";
import { EditNoteDialog } from "@/components/EditNoteDialog";
import { DeleteNoteDialog } from "@/components/DeleteNoteDialog";
import { useNotes, Note } from "@/hooks/useNotes";
import { LayoutToggle } from "@/components/LayoutToggle";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const NotesWeb = () => {
  const navigate = useNavigate();
  const { layoutType } = useDeviceDetection();
  const { notes, loading, error } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);

  useEffect(() => {
    if (layoutType === 'mobile') {
      navigate('/notes', { replace: true });
    }
  }, [layoutType, navigate]);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(notes.map(note => note.category)));
    return uniqueCategories.filter(category => category !== 'Uncategorized');
  }, [notes]);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === "all" || note.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "category":
        return a.category.localeCompare(b.category);
      case "recent":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header>
          <LayoutToggle />
        </Header>
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notes...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header>
          <LayoutToggle />
        </Header>
        <main className="container mx-auto px-6 py-8 max-w-7xl">
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading Notes</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header>
        <LayoutToggle />
      </Header>

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">My Notes</h1>
            <p className="text-lg text-muted-foreground">
              {sortedNotes.length} {sortedNotes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
          <Link to="/notes/add">
            <Button size="lg" className="bg-gradient-primary hover:shadow-elevated">
              <Plus className="w-5 h-5 mr-2" />
              Add Note
            </Button>
          </Link>
        </div>

        {/* Filters & Search */}
        <Card className="mb-6 shadow-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notes Grid */}
        {sortedNotes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedNotes.map((note) => (
              <Card key={note.id} className="shadow-card hover:shadow-elevated transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditNote(note)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteNote(note)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {note.content}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>{note.category}</span>
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                          >
                            <Tag className="w-3 h-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="w-3 h-3" />
                      <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No notes found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterCategory !== "all"
                ? "Try adjusting your search or filters"
                : "Start adding notes to your videos"}
            </p>
            <Link to="/notes/add">
              <Button className="bg-gradient-primary hover:shadow-elevated">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Note
              </Button>
            </Link>
          </div>
        )}
      </main>

      <EditNoteDialog
        note={editNote}
        categories={categories}
        isOpen={!!editNote}
        onClose={() => setEditNote(null)}
        onSave={() => setEditNote(null)}
      />

      <DeleteNoteDialog
        note={deleteNote}
        isOpen={!!deleteNote}
        onClose={() => setDeleteNote(null)}
        onDelete={() => setDeleteNote(null)}
      />
    </div>
  );
};

export default NotesWeb;
