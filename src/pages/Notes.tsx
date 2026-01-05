import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, SlidersHorizontal, FileText, Calendar, Tag } from "lucide-react";

import { Header } from "@/components/Header";
import { NoteCard } from "@/components/NoteCard";
import { EditNoteDialog } from "@/components/EditNoteDialog";
import { DeleteNoteDialog } from "@/components/DeleteNoteDialog";
import { useNotes, Note } from "@/hooks/useNotes";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";

const Notes = () => {
  const navigate = useNavigate();
  const { layoutType } = useDeviceDetection();
  const { notes, loading, error } = useNotes();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteNote, setDeleteNote] = useState<Note | null>(null);

  useEffect(() => {
    if (layoutType === 'web') {
      navigate('/notes-web', { replace: true });
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

  const handleEditNote = (note: Note) => {
    setEditNote(note);
  };

  const handleDeleteNote = (note: Note) => {
    setDeleteNote(note);
  };

  const handleSaveNote = (updatedNote: Note) => {
    // TODO: Implement save functionality with Supabase
    console.log('Save note:', updatedNote);
  };

  const handleConfirmDelete = (noteId: string) => {
    // TODO: Implement delete functionality with Supabase
    console.log('Delete note:', noteId);
  };

  const handleNoteClick = (note: Note) => {
    navigate(`/videos/${note.videoId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="My Notes" showBack={false}>
          <Link to="/notes/add">
            <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </Link>
        </Header>
        
        <main className="pb-20 px-4 pt-6">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading notes...</p>
          </div>
        </main>
        
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header title="My Notes" showBack={false}>
          <Link to="/notes/add">
            <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </Link>
        </Header>
        
        <main className="pb-20 px-4 pt-6">
          <div className="text-center py-16">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Error loading notes
            </h3>
            <p className="text-muted-foreground mb-4">
              {error}
            </p>
          </div>
        </main>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="My Notes" showBack={false}>
        <Link to="/notes/add">
          <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </Link>
      </Header>
      
      <main className="pb-20 px-4 pt-6">
        {/* Search and Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search notes, content, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border focus:ring-primary"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40 bg-card border-border">
              <Tag className="w-4 h-4 mr-2" />
              <SelectValue />
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
            <SelectTrigger className="w-32 bg-card border-border">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-gradient-card p-4 rounded-lg shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{notes.length}</p>
                <p className="text-sm text-muted-foreground">Total Notes</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-card p-4 rounded-lg shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-purple-cosmic rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {notes.filter(note => note.updatedAt === new Date().toISOString().split('T')[0]).length}
                </p>
                <p className="text-sm text-muted-foreground">Updated Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {sortedNotes.length > 0 ? (
          <div className="space-y-4">
            {sortedNotes.map((note) => (
              <NoteCard 
                key={note.id} 
                note={note}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onCardClick={handleNoteClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            {searchQuery || filterCategory !== "all" ? (
              <>
                <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No notes found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterCategory("all");
                  }}
                  variant="outline"
                  className="border-border hover:bg-muted"
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  You have no notes yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Start taking notes to remember important insights from your videos
                </p>
                <Link to="/notes/add">
                  <Button className="bg-gradient-primary hover:shadow-elevated transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Note
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </main>

      
      
      {/* Edit Note Dialog */}
      <EditNoteDialog
        note={editNote}
        categories={categories}
        isOpen={!!editNote}
        onClose={() => setEditNote(null)}
        onSave={handleSaveNote}
      />
      
      {/* Delete Note Dialog */}
      <DeleteNoteDialog
        note={deleteNote}
        isOpen={!!deleteNote}
        onClose={() => setDeleteNote(null)}
        onDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default Notes;