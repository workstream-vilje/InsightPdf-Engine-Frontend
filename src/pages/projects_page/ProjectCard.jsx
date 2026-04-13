import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import styles from "./styles.module.css";

const formatProjectCreatedAt = (value) => {
  if (!value) return "Recently created";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recently created";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCategoryBadge = (value) => {
  const normalized = String(value || "General").trim();
  return normalized.length > 12 ? normalized.slice(0, 12).toUpperCase() : normalized.toUpperCase();
};

const getDisplayProjectCode = (project) => {
  const rawCode = String(project?.projectCode || "").trim();
  if (/^PRO-\d+$/i.test(rawCode)) {
    return rawCode.toUpperCase();
  }
  const numericId = Number(project?.id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `PRO-${String(numericId).padStart(3, "0")}`;
  }
  return "PRO-000";
};

export default function ProjectCard({
  project,
  viewMode,
  deletingProjectId,
  onOpen,
  onDelete,
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className={`${styles.projectCard} ${viewMode === "list" ? styles.projectCardList : ""}`}
      variant="default"
      padding="none"
      interactive
      onClick={() => onOpen(project.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(project.id);
        }
      }}
    >
      <div className={styles.projectCardTop}>
        <div className={styles.projectCardTitleBlock}>
          <h3 className={styles.projectCardTitle}>{project.name}</h3>
          <p className={styles.projectCardSubtitle}>{getDisplayProjectCode(project)}</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={styles.projectActionButton}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(project);
          }}
          disabled={deletingProjectId === project.id}
          title="Delete project"
        >
          <Trash2 size={18} />
        </Button>
      </div>

      <Badge variant="outline" className={styles.projectBadge}>
        {formatCategoryBadge(project.category)}
      </Badge>

      <div className={styles.projectMetaRow}>
        <div className={styles.projectMetaItem}>
          <span>Documents</span>
          <strong>{project.documents}</strong>
        </div>
        <div className={styles.projectMetaItem}>
          <span>Created</span>
          <strong>{formatProjectCreatedAt(project.createdAt)}</strong>
        </div>
      </div>
    </Card>
  );
}
