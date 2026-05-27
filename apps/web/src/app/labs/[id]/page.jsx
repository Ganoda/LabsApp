
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Upload,
  Loader2,
  Download,
  Trash2,
  X,
  Image as ImageIcon,
  File as FileIcon,
  Paperclip,
  Pencil,
} from "lucide-react";
import useUpload from "@/utils/useUpload";
import { useCurrentUser } from "@/utils/useCurrentUser";

const STATUS_META = {
  pending: { label: "Не начато", dot: "bg-gray-400" },
  in_progress: { label: "В процессе", dot: "bg-blue-500" },
  done: { label: "Сдано", dot: "bg-green-500" },
};

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatRelative(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "только что";
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч назад`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} дн назад`;
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFileIcon(mimeType) {
  if (!mimeType) return FileIcon;
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("pdf")) return FileText;
  return FileIcon;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

function isUrl(s) {
  return s && (s.startsWith("http://") || s.startsWith("https://"));
}

function FileDropZone({ fileInfo, onFile, onClear, uploading }) {
  if (fileInfo) {
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#262626]">
        <div className="flex items-center gap-2 min-w-0">
          <FileIcon
            size={14}
            className="text-gray-500 dark:text-gray-400 flex-shrink-0"
          />
          <span className="text-sm text-gray-900 dark:text-white truncate">
            {fileInfo.name}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );
  }
  return (
    <label className="border border-gray-200 dark:border-gray-700 border-dashed rounded-lg px-3 py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors">
      {uploading ? (
        <>
          <Loader2
            size={18}
            className="text-gray-400"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span className="text-xs text-gray-500">Загружаем…</span>
        </>
      ) : (
        <>
          <Upload size={18} className="text-gray-400" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Нажмите чтобы выбрать файл
          </span>
          <span className="text-xs text-gray-500">
            PDF, DOCX, Word, изображения и любые другие файлы
          </span>
        </>
      )}
      <input
        type="file"
        className="hidden"
        onChange={onFile}
        disabled={uploading}
      />
    </label>
  );
}

function EditLabModal({ open, onClose, lab, subjects }) {
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();
  const [form, setForm] = useState({
    subject_id: "",
    title: "",
    description: "",
    due_date: "",
    status: "pending",
  });
  const [taskFiles, setTaskFiles] = useState([]);
  const [uploadingTaskFiles, setUploadingTaskFiles] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        subject_id: lab?.subject_id ?? "",
        title: lab?.title ?? "",
        description: lab?.description ?? "",
        due_date: lab?.due_date ? lab.due_date.split("T")[0] : "",
        status: lab?.status ?? "pending",
      });
      if (lab?.task_pdf_url) {
        try {
          if (lab.task_pdf_url.startsWith("[")) {
            setTaskFiles(JSON.parse(lab.task_pdf_url));
          } else {
            setTaskFiles([{ url: lab.task_pdf_url, name: "Текущий файл задания" }]);
          }
        } catch (e) {
          setTaskFiles([{ url: lab.task_pdf_url, name: "Текущий файл задания" }]);
        }
      } else {
        setTaskFiles([]);
      }
      setError(null);
    }
  }, [open, lab]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/labs/${lab.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab", String(lab.id)] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleFile = useCallback(
    async (e) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;
      setError(null);
      setUploadingTaskFiles(true);
      for (const selected of selectedFiles) {
        let fileToUpload = selected;
        if (selected.name.endsWith('.docx')) {
          fileToUpload = new File([selected], selected.name, {
            type: 'application/octet-stream',
          });
        }
        const result = await upload({ file: fileToUpload });
        if (result.error) {
          setError(result.error);
          setUploadingTaskFiles(false);
          return;
        }
        setTaskFiles((prev) => [
          ...prev,
          {
            url: result.url,
            name: selected.name,
            mimeType: result.mimeType || selected.type,
          },
        ]);
      }
      setUploadingTaskFiles(false);
    },
    [upload],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("Укажите название");
      return;
    }
    mutation.mutate({
      subject_id: Number(form.subject_id),
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_date: form.due_date || null,
      status: form.status,
      task_pdf_url: taskFiles.length > 0 ? JSON.stringify(taskFiles) : null,
    });
  };

  if (!open) return null;
  const inp =
    "border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#262626] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E1E1E] w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Редактировать лабораторную
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {subjects && subjects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Предмет
              </label>
              <select
                value={form.subject_id}
                onChange={(e) =>
                  setForm({ ...form, subject_id: e.target.value })
                }
                className={inp}
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Название
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={inp}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Описание
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              placeholder="Краткое описание задания…"
              className={`${inp} resize-none`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Срок сдачи
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className={inp}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Статус
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inp}
              >
                <option value="pending">Не начато</option>
                <option value="in_progress">В процессе</option>
                <option value="done">Сдано</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Файлы задания (любой формат)
            </label>
            {taskFiles.length > 0 && (
              <div className="flex flex-col gap-2 mb-2">
                {taskFiles.map((file, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#262626]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon
                        size={14}
                        className="text-gray-500 dark:text-gray-400 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTaskFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-gray-400 hover:text-gray-900 dark:hover:text-white flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="border border-gray-200 dark:border-gray-700 border-dashed rounded-lg px-3 py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors">
              {uploadingTaskFiles ? (
                <>
                  <Loader2
                    size={18}
                    className="text-gray-400"
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                  <span className="text-xs text-gray-500">Загружаем…</span>
                </>
              ) : (
                <>
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Нажмите чтобы прикрепить файлы задания
                  </span>
                  <span className="text-xs text-gray-500">
                    PDF, DOCX, Word, изображения и любые другие файлы
                  </span>
                </>
              )}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFile}
                disabled={uploadingTaskFiles}
              />
            </label>
          </div>
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || uploadingTaskFiles}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {mutation.isPending && (
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              )}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LabDetailPage({ params }) {
  const { id } = params;
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();
  const { userId, profile } = useCurrentUser();

  const [authorName, setAuthorName] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("submissions");
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: labData,
    isLoading: labLoading,
    error: labError,
  } = useQuery({
    queryKey: ["lab", id],
    queryFn: async () => {
      const res = await fetch(`/api/labs/${id}`);
      if (!res.ok) throw new Error("Не найдено");
      return res.json();
    },
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ["submissions", id],
    queryFn: async () => {
      const res = await fetch(`/api/labs/${id}/submissions`);
      if (!res.ok) throw new Error("Ошибка");
      return res.json();
    },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Ошибка");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/labs/${id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Ошибка отправки");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      setAuthorName("");
      setNote("");
      setFiles([]);
      setError(null);
      setActiveTab("submissions");
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (subId) => {
      const res = await fetch(`/api/submissions/${subId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions", id] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
    },
  });

  const handleFileSelect = useCallback(
    async (e) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;
      setError(null);
      setUploadingFiles(true);
      for (const selected of selectedFiles) {
        let fileToUpload = selected;
        if (selected.name.endsWith('.docx')) {
          fileToUpload = new File([selected], selected.name, {
            type: 'application/octet-stream',
          });
        }
        const result = await upload({ file: fileToUpload });
        if (result.error) {
          setError(result.error);
          setUploadingFiles(false);
          return;
        }
        setFiles((prev) => [
          ...prev,
          {
            url: result.url,
            name: selected.name,
            mimeType: result.mimeType || selected.type,
          },
        ]);
      }
      setUploadingFiles(false);
    },
    [upload],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    const finalName = authorName.trim() || profile?.nickname || "";
    if (!finalName) {
      setError("Укажите ваше имя");
      return;
    }
    if (files.length === 0) {
      setError("Прикрепите файлы");
      return;
    }
    submitMutation.mutate({
      author_name: finalName,
      file_url: JSON.stringify(files),
      file_name: files[0].name,
      file_mime_type: files[0].mimeType,
      note: note.trim() || null,
      user_id: userId || null,
    });
  };

  if (labLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#121212] font-inter flex items-center justify-center">
        <Loader2
          size={20}
          className="text-gray-500"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  if (labError || !labData?.lab) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#121212] font-inter flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">Лабораторная не найдена</p>
        <a href="/" className="text-sm text-blue-600 hover:underline">
          На главную
        </a>
      </div>
    );
  }

  const lab = labData.lab;
  const submissions = subsData?.submissions || [];
  const subjects = subjectsData?.subjects || [];
  const statusMeta = STATUS_META[lab.status] || STATUS_META.pending;

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#121212] font-inter">
      <style
        jsx
        global
      >{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <a
            href="/"
            className="hover:text-gray-900 dark:hover:text-white inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Все лабораторные
          </a>
        </div>

        {/* Lab header */}
        <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
                  {lab.subject_name}
                </span>
                <span className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`}
                  />
                  {statusMeta.label}
                </span>
                {lab.due_date && (
                  <span className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
                    <Calendar size={11} className="text-gray-400" />
                    до {formatDate(lab.due_date)}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
                {lab.title}
              </h1>
              {lab.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {lab.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditOpen(true)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Pencil size={14} /> Изменить
            </button>
          </div>

          {lab.task_pdf_url && (
            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
                Файлы задания
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    if (lab.task_pdf_url.startsWith("[")) {
                      return JSON.parse(lab.task_pdf_url);
                    }
                  } catch (e) {}
                  return [{ url: lab.task_pdf_url, name: "Открыть файл задания" }];
                })().map((file, fIdx) => (
                  <a
                    key={fIdx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800"
                  >
                    <FileText size={14} />
                    <span>{file.name}</span>
                    <Download size={12} className="text-blue-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("submissions")}
              className={`pb-3 text-sm border-b-2 -mb-[1px] ${
                activeTab === "submissions"
                  ? "text-gray-900 dark:text-white font-medium border-blue-600"
                  : "text-gray-500 dark:text-gray-500 font-normal border-transparent hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Решения{" "}
              <span className="text-gray-400">· {submissions.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`pb-3 text-sm border-b-2 -mb-[1px] ${
                activeTab === "upload"
                  ? "text-gray-900 dark:text-white font-medium border-blue-600"
                  : "text-gray-500 dark:text-gray-500 font-normal border-transparent hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              Добавить решение
            </button>
          </div>
        </div>

        {/* Submissions list */}
        {activeTab === "submissions" && (
          <div className="flex flex-col gap-3">
            {subsLoading && (
              <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex items-center justify-center text-sm text-gray-500 gap-2">
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />{" "}
                Загружаем решения…
              </div>
            )}
            {!subsLoading && submissions.length === 0 && (
              <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-gray-700 flex items-center justify-center mx-auto mb-3">
                  <Paperclip size={18} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  Пока нет решений
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Будьте первым, кто прикрепит свою работу
                </p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50"
                >
                  <Upload size={14} /> Добавить решение
                </button>
              </div>
            )}
            {submissions.map((sub) => {
              const avatarColor = getAvatarColor(sub.author_name);
              const subFiles = (() => {
                try {
                  if (sub.file_url && sub.file_url.startsWith("[")) {
                    return JSON.parse(sub.file_url);
                  }
                } catch (e) {}
                return [
                  {
                    url: sub.file_url,
                    name: sub.file_name || "Файл",
                    mimeType: sub.file_mime_type,
                  },
                ];
              })();

              return (
                <div
                  key={sub.id}
                  className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {sub.profile_avatar && isUrl(sub.profile_avatar) ? (
                      <img
                        src={sub.profile_avatar}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                    ) : sub.profile_avatar ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#262626]">
                        {sub.profile_avatar}
                      </div>
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold border border-gray-200 dark:border-gray-700 ${avatarColor}`}
                      >
                        {getInitials(sub.author_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {sub.author_name}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatRelative(sub.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        {new Date(sub.created_at).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {sub.note && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                          {sub.note}
                        </p>
                      )}
                      
                      <div className="flex flex-col gap-2 mt-2">
                        {subFiles.map((file, fIdx) => {
                          const Icon = getFileIcon(file.mimeType);
                          return (
                            <a
                              key={fIdx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={file.name}
                              className="inline-flex items-center gap-2 bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-[#1E1E1E] transition-colors group max-w-full"
                            >
                              <Icon
                                size={14}
                                className="text-gray-500 flex-shrink-0"
                              />
                              <span className="truncate flex-1">{file.name}</span>
                              <Download
                                size={12}
                                className="text-gray-400 group-hover:text-gray-700 flex-shrink-0"
                              />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm("Удалить это решение?"))
                          deleteMutation.mutate(sub.id);
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      aria-label="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload form */}
        {activeTab === "upload" && (
          <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Прикрепить решение
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              PDF, DOCX, изображения или любой другой файл
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={
                    profile?.nickname ? profile.nickname : "Иван Петров"
                  }
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#262626] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E1E1E] w-full"
                />
                {profile && !authorName && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Будет прикреплено от: {profile.avatar} {profile.nickname}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Файлы решения
                </label>
                {files.length > 0 && (
                  <div className="flex flex-col gap-2 mb-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#262626]">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon
                            size={14}
                            className="text-gray-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {f.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-gray-400 hover:text-gray-900 flex-shrink-0"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="border border-gray-200 dark:border-gray-700 border-dashed rounded-lg px-3 py-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors">
                  {uploadingFiles ? (
                    <>
                      <Loader2
                        size={18}
                        className="text-gray-400"
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      <span className="text-xs text-gray-500">
                        Загружаем…
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Нажмите чтобы выбрать файлы
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        PDF, DOCX, Word, изображения и любые другие файлы
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    disabled={uploadingFiles}
                  />
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Комментарий (опционально)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Например: моя версия с пояснениями, вариант №3…"
                  rows={3}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 resize-none"
                />
              </div>
              {error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("submissions")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626]"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending || uploadingFiles}
                  className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  {submitMutation.isPending && (
                    <Loader2
                      size={14}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  )}
                  Прикрепить
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <EditLabModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lab={lab}
        subjects={subjects}
      />
    </div>
  );
}
