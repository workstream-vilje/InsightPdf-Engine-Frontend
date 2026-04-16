import classNames from "classnames";

import { SkeletonBlock, SkeletonLine } from "@/components/skeletons/SkeletonPrimitives";
import pageStyles from "@/pages/projects_page/styles.module.css";

function ProjectCardSkeleton() {
  return (
    <div className={pageStyles.projectCard} aria-hidden>
      <div className={pageStyles.projectCardTop}>
        <div className={pageStyles.projectCardTitleBlock}>
          <SkeletonLine style={{ width: "72%", maxWidth: 220 }} />
          <SkeletonLine style={{ width: "40%", maxWidth: 120, marginTop: 10 }} />
        </div>
        <SkeletonBlock style={{ width: 28, height: 28, borderRadius: 8 }} />
      </div>
      <SkeletonBlock style={{ width: 88, height: 26, borderRadius: 8 }} />
      <div className={pageStyles.projectMetaRow}>
        <div className={pageStyles.projectMetaItem}>
          <SkeletonLine style={{ width: 64 }} />
          <SkeletonLine style={{ width: 36, marginTop: 6 }} />
        </div>
        <div className={pageStyles.projectMetaItem}>
          <SkeletonLine style={{ width: 56 }} />
          <SkeletonLine style={{ width: 96, marginTop: 6 }} />
        </div>
      </div>
    </div>
  );
}

function ProjectTableRowSkeleton() {
  return (
    <tr aria-hidden>
      <td>
        <SkeletonLine style={{ width: "78%" }} />
      </td>
      <td>
        <SkeletonLine style={{ width: 72 }} />
      </td>
      <td>
        <SkeletonBlock style={{ width: 56, height: 22, borderRadius: 8 }} />
      </td>
      <td>
        <SkeletonLine style={{ width: 64 }} />
      </td>
      <td>
        <SkeletonLine style={{ width: 28 }} />
      </td>
      <td>
        <SkeletonLine style={{ width: 120 }} />
      </td>
      <td>
        <SkeletonBlock style={{ width: 28, height: 28, borderRadius: 8 }} />
      </td>
    </tr>
  );
}

export default function ProjectsPageSkeleton({ count, viewMode }) {
  const safeCount = Math.max(1, Number(count) || 1);

  if (viewMode === "list") {
    return (
      <div className={pageStyles.tableWrapper}>
        <table className={pageStyles.projectsTable}>
          <thead>
            <tr>
              <th>Project</th>
              <th>Project ID</th>
              <th>Status</th>
              <th>Category</th>
              <th>Total Documents</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: safeCount }, (_, i) => (
              <ProjectTableRowSkeleton key={`sk-row-${i}`} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className={classNames(pageStyles.projectGrid, {
        [pageStyles.projectList]: viewMode === "list",
      })}
    >
      {Array.from({ length: safeCount }, (_, i) => (
        <ProjectCardSkeleton key={`sk-card-${i}`} />
      ))}
    </div>
  );
}
