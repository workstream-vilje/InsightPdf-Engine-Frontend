"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, House, X } from "lucide-react";
import ProjectsPageView from "@/pages/projects_page/ProjectsPageView";
import TopNavbar from "@/components/common/top-navbar/TopNavbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppWorkspaceRail from "./AppWorkspaceRail";
import styles from "./Home/Projects.module.css";

const PROJECTS_PER_PAGE = 5;

export default function ProjectsListView({
  userProfile,
  topNavbarBreadcrumbItems,
  handleRailProjects,
  handleRailSettings,
  handleRailLogout,
  isCreateProjectOpen,
  setIsCreateProjectOpen,
  paginatedVisibleProjects,
  searchValue,
  setSearchValue,
  projectFilter,
  setProjectFilter,
  sortOption,
  setSortOption,
  projectViewMode,
  setProjectViewMode,
  projectPage,
  setProjectPage,
  totalProjectPages,
  availableProjectNames,
  deletingProjectId,
  handleOpenProject,
  setProjectPendingDelete,
  setDeleteProjectInput,
  projectsListLoading,
  newProjectName,
  setNewProjectName,
  newProjectCategory,
  setNewProjectCategory,
  isCreatingProject,
  handleCreateProject,
  projectPendingDelete,
  deleteProjectInput,
  handleDeleteProject,
}) {
  return (
    <div className={styles.workspaceWithTopNav}>
      <TopNavbar
        userProfile={userProfile}
        actions={[]}
        breadcrumbItems={topNavbarBreadcrumbItems}
      />
      <div className={styles.workspaceShell}>
        <AppWorkspaceRail
          onProjects={handleRailProjects}
          onSettings={handleRailSettings}
          onLogout={handleRailLogout}
          projectsButtonLabel={isCreateProjectOpen ? "Back to home" : "Projects"}
          projectsButtonTitle={isCreateProjectOpen ? "Back to home (close create project)" : "Projects"}
          ProjectsNavIcon={isCreateProjectOpen ? House : ArrowLeft}
        />
        <div className={styles.workspaceProjectsMain}>
          <ProjectsPageView
            embedded
            projects={paginatedVisibleProjects}
            userProfile={userProfile}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            projectFilter={projectFilter}
            onFilterChange={setProjectFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
            projectViewMode={projectViewMode}
            onProjectViewModeChange={setProjectViewMode}
            currentPage={projectPage}
            totalPages={totalProjectPages}
            onPageChange={setProjectPage}
            availableProjectNames={availableProjectNames}
            deletingProjectId={deletingProjectId}
            onCreateProject={() => setIsCreateProjectOpen(true)}
            onOpenProject={handleOpenProject}
            onDeleteProject={(projectToDelete) => {
              setProjectPendingDelete(projectToDelete);
              setDeleteProjectInput("");
            }}
            isProjectsLoading={projectsListLoading}
            projectsSkeletonCount={PROJECTS_PER_PAGE}
          />
        </div>
      </div>

      <div className={styles.projectsShell}>
        {/* Create project modal */}
        <AnimatePresence>
          {isCreateProjectOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={styles.modalOverlay}
              onClick={() => setIsCreateProjectOpen(false)}
            >
              <motion.section
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                className={styles.createModal}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.createModalHeader}>
                  <div>
                    <h2 className={styles.createModalTitle}>Create project</h2>
                    <p className={styles.createModalSubtitle}>
                      Add a project name and category, then open the workspace from the card.
                    </p>
                  </div>
                  <button type="button" className={styles.modalCloseButton} onClick={() => setIsCreateProjectOpen(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.createModalBody}>
                  <div className={styles.createPanelGrid}>
                    <label className={styles.formField}>
                      <span className={styles.modalFieldLabel}>Project name</span>
                      <Input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Enter project name" className={styles.modalInput} />
                    </label>
                    <label className={styles.formField}>
                      <span className={styles.modalFieldLabel}>Category name</span>
                      <Input value={newProjectCategory} onChange={(e) => setNewProjectCategory(e.target.value)} placeholder="Enter category name" className={styles.modalInput} />
                    </label>
                  </div>
                </div>
                <div className={styles.createModalActions}>
                  <div className={styles.createModalActionsInner}>
                    <Button type="button" variant="outline" className={styles.devModalBtnSecondary} onClick={() => setIsCreateProjectOpen(false)} disabled={isCreatingProject}>
                      Cancel
                    </Button>
                    <Button className={styles.createProjectCta} onClick={handleCreateProject} disabled={isCreatingProject || !newProjectName.trim() || !newProjectCategory.trim()}>
                      {isCreatingProject ? "Creating..." : "Create project"}
                    </Button>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete project modal */}
        <AnimatePresence>
          {projectPendingDelete && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className={styles.modalOverlay}
              onClick={() => { if (deletingProjectId) return; setProjectPendingDelete(null); setDeleteProjectInput(""); }}
            >
              <motion.section
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                className={styles.deleteModal}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.createModalHeader}>
                  <div>
                    <h2 className={styles.createModalTitle}>Delete project</h2>
                    <p className={styles.createModalSubtitle}>
                      This action permanently deletes the project, its files, and related experiment history.
                    </p>
                  </div>
                  <button type="button" className={styles.modalCloseButton} onClick={() => { if (deletingProjectId) return; setProjectPendingDelete(null); setDeleteProjectInput(""); }}>
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.createModalBody}>
                  <div className={styles.deleteModalContent}>
                    <p className={styles.deleteWarningText}>
                      Type <strong>{projectPendingDelete.name}</strong> to confirm deletion.
                    </p>
                    <label className={styles.formField}>
                      <span className={styles.modalFieldLabel}>Project name confirmation</span>
                      <Input value={deleteProjectInput} onChange={(e) => setDeleteProjectInput(e.target.value)} placeholder={projectPendingDelete.name} className={styles.modalInput} />
                    </label>
                  </div>
                </div>
                <div className={styles.createModalActions}>
                  <div className={styles.deleteModalActions}>
                    <Button variant="outline" className={styles.deleteCancelButton} onClick={() => { if (deletingProjectId) return; setProjectPendingDelete(null); setDeleteProjectInput(""); }} disabled={Boolean(deletingProjectId)}>
                      Cancel
                    </Button>
                    <Button className={styles.deleteProjectCta} onClick={handleDeleteProject} disabled={deletingProjectId === projectPendingDelete.id || deleteProjectInput.trim() !== projectPendingDelete.name}>
                      {deletingProjectId === projectPendingDelete.id ? "Deleting..." : "Delete project"}
                    </Button>
                  </div>
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
