
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  Users,
  ChevronRight,
  X,
  Upload,
  Loader2,
  Pencil,
  Trash2,
  Settings,
  File as FileIcon,
  Image as ImageIcon,
} from "lucide-react";
import useUpload from "@/utils/useUpload";
import { useCurrentUser } from "@/utils/useCurrentUser";

const STATUS_META = {
  pending: { label: "Не начато", dot: "bg-gray-400" },
  in_progress: { label: "В процессе", dot: "bg-blue-500" },
  done: { label: "Сдано", dot: "bg-green-500" },
};
const AVATARS = [
  "😊",
  "🐱",
  "🦊",
  "🐻",
  "🐼",
  "🐸",
  "🦁",
  "🐯",
  "🐺",
  "🦋",
  "🐙",
  "🦄",
  "🐧",
  "🦉",
  "🐳",
  "🦖",
  "🎃",
  "👾",
  "🤖",
  "🎯",
  "🔥",
  "⚡",
  "🌊",
  "🍕",
];

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function isUrl(s) {
  return s && (s.startsWith("http://") || s.startsWith("https://"));
}

function ProfileAvatar({ avatar, className = "w-5 h-5" }) {
  if (isUrl(avatar))
    return (
      <img
        src={avatar}
        alt=""
        className={`${className} rounded-full object-cover`}
      />
    );
  return <span className="text-base leading-none">{avatar || "😊"}</span>;
}

function StatusPill({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function StatusSelect({ value, onChange }) {
  const m = STATUS_META[value] || STATUS_META.pending;
  return (
    <div className="relative inline-flex items-center">
      <span
        className={`absolute left-2.5 w-1.5 h-1.5 rounded-full pointer-events-none ${m.dot}`}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-full pl-6 pr-3 py-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <option value="pending">Не начато</option>
        <option value="in_progress">В процессе</option>
        <option value="done">Сдано</option>
      </select>
    </div>
  );
}

function FileDropZone({ fileInfo, onFile, onClear, uploading }) {
  if (fileInfo)
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

// ─── Profile modal ─────────────────────────────────────────────────────────────
function ProfileModal({ open, onClose, currentProfile, onSave, userId, onLogOut }) {
  const [uploadFn, { loading: uploadingPhoto }] = useUpload();
  const [nickname, setNickname] = useState(currentProfile?.nickname || "");
  const [avatar, setAvatar] = useState(currentProfile?.avatar || "😊");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Sync state
  const [syncKey, setSyncKey] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setNickname(currentProfile?.nickname || "");
      setAvatar(currentProfile?.avatar || "😊");
      setSyncKey("");
      setSyncError(null);
      setError(null);
    }
  }, [open, currentProfile]);

  const handlePhotoUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const result = await uploadFn({ file });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAvatar(result.url);
    },
    [uploadFn],
  );

  const handleSave = async () => {
    if (!nickname.trim()) {
      setError("Введи никнейм");
      return;
    }
    setSaving(true);
    try {
      await onSave({ nickname: nickname.trim(), avatar });
      onClose();
    } catch {
      setError("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!syncKey.trim()) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/users/profile?id=${syncKey.trim()}`);
      const data = await res.json();
      if (data.profile) {
        localStorage.setItem("labs_user_id", data.profile.id);
        window.location.reload();
      } else {
        setSyncError("Неверный код синхронизации");
      }
    } catch {
      setSyncError("Ошибка соединения при синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  const handleCopy = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;
  const isNew = !currentProfile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-xl">
        <div className="px-6 pt-7 pb-2 text-center">
          <div className="flex justify-center mb-3">
            {isUrl(avatar) ? (
              <img
                src={avatar}
                alt="avatar"
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-400"
              />
            ) : (
              <span className="text-5xl">{avatar}</span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {isNew ? "Кто ты?" : "Профиль"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {isNew
              ? "Выбери аватар и ник — займёт 5 секунд"
              : "Сменить аватар или ник"}
          </p>
        </div>
        <div className="px-6 pb-6">
          <div className="grid grid-cols-8 gap-1.5 mb-3">
            {AVATARS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setAvatar(e)}
                className={`text-xl p-1.5 rounded-lg transition-all ${avatar === e ? "bg-blue-50 dark:bg-blue-900/40 ring-2 ring-blue-400 scale-110" : "hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              или
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <label className="w-full mb-1 flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors">
            {uploadingPhoto ? (
              <>
                <Loader2
                  size={15}
                  className="text-gray-400 animate-spin"
                />
                Загружаем…
              </>
            ) : (
              <>
                <ImageIcon size={15} className="text-gray-400" />
                Выбрать фото из галереи
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
            />
          </label>
          {isUrl(avatar) && (
            <button
              onClick={() => setAvatar("😊")}
              className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-2 text-center py-1"
            >
              Убрать фото, вернуть эмодзи
            </button>
          )}

          <div className="flex flex-col gap-1.5 mb-4 mt-3">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Никнейм
            </label>
            <input
              autoFocus
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              maxLength={32}
              placeholder="Например: Макс или Лёха"
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#262626] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E1E1E] w-full"
            />
            {isNew && (
              <p className="text-xs text-gray-400 dark:text-gray-650 mt-1 leading-normal">
                Код синхронизации можно будет скопировать в профиле после входа.
              </p>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim() || uploadingPhoto}
            className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 mb-2"
          >
            {saving && (
              <Loader2
                size={14}
                className="animate-spin"
              />
            )}
            {isNew ? "Войти" : "Сохранить"}
          </button>
          {!isNew && (
            <button
              onClick={onClose}
              className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Отмена
            </button>
          )}

          {/* Sync & Settings Section */}
          {!isNew && userId && (
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-750">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Синхронизация устройств
              </h3>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={userId}
                    className="border border-gray-200 dark:border-gray-750 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#262626] flex-1 text-center font-mono select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    {copied ? "Скопировано!" : "Копировать"}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-normal">
                  Вставьте этот код на другом устройстве, чтобы продолжить работу со своими лабораторными работами.
                </p>

                {/* Import Account */}
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Вставьте код с другого устройства"
                    value={syncKey}
                    onChange={(e) => setSyncKey(e.target.value)}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white bg-white dark:bg-[#262626] flex-1 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E1E1E]"
                  />
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={!syncKey.trim() || syncing}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
                  >
                    {syncing && <Loader2 size={10} className="animate-spin" />}
                    Войти
                  </button>
                </div>
                {syncError && (
                  <div className="text-[11px] text-red-650 dark:text-red-400">
                    {syncError}
                  </div>
                )}
                
                {/* Log Out */}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Выйти из этого аккаунта? Текущие данные останутся доступны на других устройствах по вашему коду синхронизации.")) {
                      onLogOut();
                      window.location.reload();
                    }
                  }}
                  className="w-full mt-1.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg transition-colors"
                >
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lab Modal ──────────────────────────────────────────────────────────────
function LabModal({ open, onClose, subjects, editLab }) {
  const queryClient = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();
  const isEdit = Boolean(editLab);
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
        subject_id: editLab?.subject_id ?? "",
        title: editLab?.title ?? "",
        description: editLab?.description ?? "",
        due_date: editLab?.due_date ? editLab.due_date.split("T")[0] : "",
        status: editLab?.status ?? "pending",
      });
      if (editLab?.task_pdf_url) {
        try {
          if (editLab.task_pdf_url.startsWith("[")) {
            setTaskFiles(JSON.parse(editLab.task_pdf_url));
          } else {
            setTaskFiles([{ url: editLab.task_pdf_url, name: "Текущий файл задания" }]);
          }
        } catch (e) {
          setTaskFiles([{ url: editLab.task_pdf_url, name: "Текущий файл задания" }]);
        }
      } else {
        setTaskFiles([]);
      }
      setError(null);
    }
  }, [open, editLab]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(
        isEdit ? `/api/labs/${editLab.id}` : "/api/labs",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error("Ошибка");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      queryClient.invalidateQueries({ queryKey: ["lab", String(editLab?.id)] });
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
    if (!form.subject_id || !form.title.trim()) {
      setError("Укажите предмет и название");
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
            {isEdit ? "Редактировать лабу" : "Новая лабораторная"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Предмет
            </label>
            <select
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              className={inp}
            >
              <option value="">Выберите предмет</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Название
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Лабораторная №..."
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
                Статус по умолчанию
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
              {isEdit ? "Сохранить" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Subjects Modal ──────────────────────────────────────────────────────────
function SubjectsModal({ open, onClose, subjects }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState(null);
  const inp =
    "border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#262626] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1E1E1E]";
  const addMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!r.ok) throw new Error("Ошибка");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setNewName("");
      setError(null);
    },
    onError: (e) => setError(e.message),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, name }) => {
      const r = await fetch(`/api/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!r.ok) throw new Error("Ошибка");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      setEditingId(null);
      setError(null);
    },
    onError: (e) => setError(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Ошибка");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["labs"] });
      setError(null);
    },
    onError: (e) => setError(e.message),
  });
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Предметы
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-2">
            {subjects.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-2">
                Предметов пока нет
              </p>
            )}
            {subjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 bg-white dark:bg-[#262626]"
              >
                {editingId === s.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editingName.trim())
                          updateMutation.mutate({
                            id: s.id,
                            name: editingName.trim(),
                          });
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 text-sm text-gray-900 dark:text-white bg-transparent outline-none"
                    />
                    <button
                      onClick={() => {
                        if (editingName.trim())
                          updateMutation.mutate({
                            id: s.id,
                            name: editingName.trim(),
                          });
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium px-1"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 dark:hover:text-gray-200 hover:text-gray-700"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">
                      {s.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#1E1E1E] border border-gray-100 dark:border-gray-700 rounded-full px-2 py-0.5">
                      {s.labs_count} лаб
                    </span>
                    <button
                      onClick={() => {
                        setError(null);
                        setEditingId(s.id);
                        setEditingName(s.name);
                      }}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        if (s.labs_count > 0) {
                          setError(
                            `Сначала удалите ${s.labs_count} лаб из этого предмета`,
                          );
                          return;
                        }
                        if (confirm("Удалить предмет?"))
                          deleteMutation.mutate(s.id);
                      }}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) addMutation.mutate();
              }}
              placeholder="Новый предмет…"
              className={`${inp} flex-1`}
            />
            <button
              onClick={() => {
                if (newName.trim()) addMutation.mutate();
              }}
              disabled={!newName.trim() || addMutation.isPending}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-1"
            >
              {addMutation.isPending ? (
                <Loader2
                  size={14}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Plus size={14} />
              )}
              Добавить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function Home() {
  const {
    userId,
    profile,
    loading: userLoading,
    saveProfile,
    clearProfile,
    isSetup,
  } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editLab, setEditLab] = useState(null);
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userLoading && !isSetup) setShowSetup(true);
    else if (isSetup) setShowSetup(false);
  }, [userLoading, isSetup]);

  const {
    data: labsData,
    isLoading: labsLoading,
    error: labsError,
  } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const r = await fetch("/api/labs");
      if (!r.ok) throw new Error();
      return r.json();
    },
  });
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const r = await fetch("/api/subjects");
      if (!r.ok) throw new Error();
      return r.json();
    },
  });
  const { data: userStatusData } = useQuery({
    queryKey: ["userStatuses", userId],
    queryFn: async () => {
      const r = await fetch(`/api/users/lab-statuses?userId=${userId}`);
      if (!r.ok) return { statuses: [] };
      return r.json();
    },
    enabled: Boolean(userId),
  });

  const statusMap = useMemo(() => {
    const m = {};
    (userStatusData?.statuses || []).forEach((s) => {
      m[s.lab_id] = s.status;
    });
    return m;
  }, [userStatusData]);

  const setStatusMutation = useMutation({
    mutationFn: async ({ labId, status }) => {
      const r = await fetch("/api/users/lab-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, labId, status }),
      });
      if (!r.ok) throw new Error();
      return r.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["userStatuses", userId] }),
  });
  const deleteLabMutation = useMutation({
    mutationFn: async (id) => {
      const r = await fetch(`/api/labs/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["labs"] }),
  });

  const subjects = subjectsData?.subjects || [];
  const labs = labsData?.labs || [];
  const filtered = useMemo(
    () =>
      labs.filter((l) => {
        if (activeSubject !== "all" && l.subject_id !== Number(activeSubject))
          return false;
        if (
          search &&
          !l.title.toLowerCase().includes(search.toLowerCase()) &&
          !l.subject_name.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [labs, activeSubject, search],
  );
  const stats = useMemo(() => {
    const ms = (l) => statusMap[l.id] || l.status;
    return {
      total: labs.length,
      done: labs.filter((l) => ms(l) === "done").length,
      inProgress: labs.filter((l) => ms(l) === "in_progress").length,
      pending: labs.filter((l) => ms(l) === "pending").length,
    };
  }, [labs, statusMap]);

  if (userLoading)
    return (
      <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#121212] flex items-center justify-center">
        <Loader2
          size={20}
          className="text-gray-400"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#121212] font-inter">
      <style
        jsx
        global
      >{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <ProfileModal
        open={showSetup}
        onClose={() => {}}
        currentProfile={null}
        onSave={saveProfile}
        userId={userId}
        onLogOut={clearProfile}
      />
      <ProfileModal
        open={profileOpen && !showSetup}
        onClose={() => setProfileOpen(false)}
        currentProfile={profile}
        onSave={saveProfile}
        userId={userId}
        onLogOut={clearProfile}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1.5 self-start">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              Семестр 2025/2026
            </span>
            <h1 className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">
              Лабораторные работы
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Все задания, файлы и решения в одном месте
            </p>
          </div>
          <div className="flex items-center gap-2 self-start flex-wrap">
            {profile && (
              <button
                onClick={() => setProfileOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626]"
              >
                <ProfileAvatar avatar={profile.avatar} />
                <span className="max-w-[120px] truncate">
                  {profile.nickname}
                </span>
              </button>
            )}
            <button
              onClick={() => setSubjectsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1E1E1E] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#262626]"
            >
              <Settings size={15} />
              Предметы
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              Добавить лабу
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-1">
          <StatCard label="Всего" value={stats.total} dotClass="bg-gray-400" />
          <StatCard
            label="Не начато"
            value={stats.pending}
            dotClass="bg-gray-400"
          />
          <StatCard
            label="В процессе"
            value={stats.inProgress}
            dotClass="bg-blue-500"
          />
          <StatCard label="Сдано" value={stats.done} dotClass="bg-green-500" />
        </div>
        {profile && (
          <p className="text-xs text-gray-400 dark:text-gray-600 mb-5 pl-1 mt-1.5">
            Статусы — только твои, у друзей свои
          </p>
        )}

        <div className="border-b border-gray-200 dark:border-gray-800 mb-6 overflow-x-auto">
          <div className="flex items-center gap-6 min-w-max">
            <TabButton
              active={activeSubject === "all"}
              onClick={() => setActiveSubject("all")}
            >
              Все{" "}
              <span className="text-gray-400 dark:text-gray-600">
                · {labs.length}
              </span>
            </TabButton>
            {subjects.map((s) => (
              <TabButton
                key={s.id}
                active={String(activeSubject) === String(s.id)}
                onClick={() => setActiveSubject(s.id)}
              >
                {s.name}{" "}
                <span className="text-gray-400 dark:text-gray-600">
                  · {s.labs_count}
                </span>
              </TabButton>
            ))}
          </div>
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или предмету"
            className="w-full bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#121212]"
          />
        </div>

        <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="col-span-5 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Название
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Предмет
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Срок
            </div>
            <div className="col-span-1 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide text-center">
              Решений
            </div>
            <div className="col-span-2 text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Мой статус
            </div>
          </div>
          {labsLoading && (
            <div className="px-5 py-12 flex items-center justify-center text-sm text-gray-500 dark:text-gray-500 gap-2">
              <Loader2
                size={16}
                style={{ animation: "spin 1s linear infinite" }}
              />
              Загружаем…
            </div>
          )}
          {labsError && (
            <div className="px-5 py-12 text-sm text-red-600 dark:text-red-400 text-center">
              Не удалось загрузить лабораторные
            </div>
          )}
          {!labsLoading && !labsError && filtered.length === 0 && (
            <div className="px-5 py-16 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Ничего не найдено
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Добавьте новую лабораторную или измените фильтры
              </p>
            </div>
          )}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((lab) => {
              const myStatus = statusMap[lab.id] || lab.status;
              return (
                <div
                  key={lab.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-[#262626] transition-colors items-center group"
                >
                  <a
                    href={`/labs/${lab.id}`}
                    className="md:col-span-5 flex items-center gap-3 min-w-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-gray-700 flex items-center justify-center flex-shrink-0">
                      <FileText
                        size={14}
                        className="text-gray-500 dark:text-gray-400"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {lab.title}
                      </div>
                      {lab.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {lab.description}
                        </div>
                      )}
                    </div>
                  </a>
                  <a href={`/labs/${lab.id}`} className="md:col-span-2">
                    <span className="bg-white dark:bg-[#262626] border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 inline-flex items-center">
                      {lab.subject_name}
                    </span>
                  </a>
                  <a
                    href={`/labs/${lab.id}`}
                    className="md:col-span-2 text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5"
                  >
                    <Calendar
                      size={12}
                      className="text-gray-400 dark:text-gray-500"
                    />
                    {formatDate(lab.due_date)}
                  </a>
                  <a
                    href={`/labs/${lab.id}`}
                    className="md:col-span-1 text-xs text-gray-700 dark:text-gray-300 md:text-center inline-flex items-center gap-1.5 md:justify-center"
                  >
                    <Users
                      size={12}
                      className="text-gray-400 dark:text-gray-500"
                    />
                    {lab.submissions_count}
                  </a>
                  <div className="md:col-span-2 flex items-center justify-between gap-1">
                    {userId ? (
                      <StatusSelect
                        value={myStatus}
                        onChange={(s) =>
                          setStatusMutation.mutate({ labId: lab.id, status: s })
                        }
                      />
                    ) : (
                      <StatusPill status={myStatus} />
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditLab(lab)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Удалить лабораторную?"))
                            deleteLabMutation.mutate(lab.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight
                        size={15}
                        className="text-gray-300 dark:text-gray-600 hidden md:block ml-0.5"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LabModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        subjects={subjects}
        editLab={null}
      />
      <LabModal
        open={Boolean(editLab)}
        onClose={() => setEditLab(null)}
        subjects={subjects}
        editLab={editLab}
      />
      <SubjectsModal
        open={subjectsOpen}
        onClose={() => setSubjectsOpen(false)}
        subjects={subjects}
      />
    </div>
  );
}

function StatCard({ label, value, dotClass }) {
  return (
    <div className="bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        {label}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
        {value}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm whitespace-nowrap focus-visible:outline-none border-b-2 -mb-[1px] ${active ? "text-gray-900 dark:text-white font-medium border-blue-600" : "text-gray-500 dark:text-gray-500 font-normal border-transparent hover:text-gray-700 dark:hover:text-gray-300"}`}
    >
      {children}
    </button>
  );
}
