import mongoose from "mongoose";

export interface INote extends mongoose.Document {
  user: mongoose.Types.ObjectId;
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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: [true, "Please provide a title for this note."], maxlength: [65536, "Title storage limit exceeded"] },
    code: { type: String, required: [true, "Please provide the code snippet."], maxlength: [2097152, "Code storage limit exceeded"] },
    language: { type: String, default: "javascript" },
    tags: [{ type: String }],
    isFavorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Note || mongoose.model<INote>("Note", NoteSchema);
