import { ChevronDown, Grid2x2, List, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TopNavbar from "@/components/common/top-navbar/TopNavbar";
import ProjectsPageSkeleton from "@/components/skeletons/ProjectsPageSkeleton";
import ProjectCard from "@/pages/projects_page/ProjectCard";
import styles from "./styles.module.css";

const formatProjectCreatedAt = (value) => {
  if (!value) return { date: "-", time: "-" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "-", time: "-" };

  return {
    date: parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    time: parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  };
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

export default function ProjectsPageView({
  embedded = false,
  projects,
  userProfile,
  searchValue,
  onSearchChange,
  projectFilter,
  onFilterChange,
  sortOption,
  onSortChange,
  projectViewMode,
  onProjectViewModeChange,
  currentPage,
  totalPages,
  onPageChange,
  availableProjectNames,
  deletingProjectId,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  isProjectsLoading = false,
  projectsSkeletonCount = 5,
}) {
  return (
    <main className={embedded ? styles.pageShellEmbedded : styles.pageShell}>
      {!embedded && <TopNavbar userProfile={userProfile} />}
      <section className={embedded ? styles.pageContentEmbedded : styles.pageContent}>
        <header className={styles.pageHeader}>
          <div className={styles.pageTitleRow}>
            <h1 className={styles.pageTitle}>Projects</h1>
          </div>
        </header>

        <section className={styles.toolbarRow}>
          <div className={styles.toolbarLeft}>
            <div className={styles.searchField}>
              <Search size={18} className={styles.searchIcon} />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search for a project"
                className={styles.searchInput}
              />
            </div>

            <label className={styles.filterField}>
              <select
                suppressHydrationWarning
                value={projectFilter}
                onChange={(event) => onFilterChange(event.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All</option>
                {availableProjectNames.map((projectName) => (
                  <option key={projectName} value={projectName}>
                    {projectName}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.sortField}>
              <select
                suppressHydrationWarning
                value={sortOption}
                onChange={(event) => onSortChange(event.target.value)}
                className={styles.sortSelect}
              >
                <option value="name-asc">Sort by name</option>
                <option value="created-desc">Sort by creation date</option>
              </select>
              <ChevronDown size={16} className={styles.sortIcon} />
            </label>
          </div>
          <div className={styles.toolbarRight}>
            <div className={styles.viewSwitch}>
              <button
                type="button"
                className={`${styles.viewButton} ${
                  projectViewMode === "grid" ? styles.viewButtonActive : ""
                }`}
                onClick={() => onProjectViewModeChange("grid")}
                aria-label="Grid view"
                title="Grid view"
              >
                <Grid2x2 size={16} />
              </button>
              <button
                type="button"
                className={`${styles.viewButton} ${
                  projectViewMode === "list" ? styles.viewButtonActive : ""
                }`}
                onClick={() => onProjectViewModeChange("list")}
                aria-label="List view"
                title="List view"
              >
                <List size={16} />
              </button>
            </div>
            <Button className={styles.createButton} onClick={onCreateProject}>
              <Plus size={16} />
              New project
            </Button>
          </div>
        </section>

        {isProjectsLoading ? (
          <ProjectsPageSkeleton count={projectsSkeletonCount} viewMode={projectViewMode} />
        ) : projects.length > 0 ? (
          <section
            className={`${styles.projectGrid} ${
              projectViewMode === "list" ? styles.projectList : ""
            } ${styles.projectDataReveal}`}
          >
            {projectViewMode === "list" ? (
              <div className={styles.tableWrapper}>
                <table className={styles.projectsTable}>
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
                    {projects.map((project) => {
                      const createdAt = formatProjectCreatedAt(project.createdAt);
                      return (
                      <tr key={project.id} onClick={() => onOpenProject(project.id)}>
                        <td>
                          <div className={styles.tableProjectCell}>
                            <strong>{project.name}</strong>
                          </div>
                        </td>
                        <td>{getDisplayProjectCode(project)}</td>
                        <td>
                          <Badge variant="outline" className={styles.tableStatusBadge}>
                            Active
                          </Badge>
                        </td>
                        <td>{project.category || "General"}</td>
                        <td>{project.documents ?? 0}</td>
                        <td>
                          <div className={styles.tableCreatedCell}>
                            <strong>{createdAt.date}</strong>
                            <span>{createdAt.time}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.tableActionButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteProject(project);
                            }}
                            disabled={deletingProjectId === project.id}
                            title="Delete project"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            ) : (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={projectViewMode}
                  deletingProjectId={deletingProjectId}
                  onOpen={onOpenProject}
                  onDelete={onDeleteProject}
                />
              ))
            )}
          </section>
        ) : (
          <div className={styles.emptyState}>
            <p>No projects yet. Click New project to create one.</p>
          </div>
        )}
        {totalPages > 1 && !isProjectsLoading && (
          <div className={styles.paginationRow}>
            {Array.from({ length: totalPages }, (_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  className={`${styles.paginationButton} ${
                    page === currentPage ? styles.paginationButtonActive : ""
                  }`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
