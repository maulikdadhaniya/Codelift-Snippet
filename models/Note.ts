import mongoose from "mongoose";

export interface INote extends mongoose.Document {
  title: string;
  code: string;
  language: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Please provide a title for this note.'], maxlength: [60, 'Title cannot be more than 60 characters'] },
    code: { type: String, required: [true, 'Please provide the code snippet.'] },
    language: { type: String, default: "javascript" },
    tags: [{ type: String }],
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);
