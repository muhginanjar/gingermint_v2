/**
 * Projects, folders, members, tools and stars.
 *
 * Visibility rule (see services/access.ts): a person sees a project when
 * they are an account admin, a member (incl. client), or the project has
 * access = 'all'. Templates (is_template = 1) never show on Home.
 */
import { db } from "../db";

export interface ProjectRow {
	id: number;
	name: string;
	description: string;
	icon: string;
	color: string;
	logoUrl: string | null;
	folderId: number | null;
	leadId: number | null;
	phase: string;
	status: string;
	startOn: string | null;
	endOn: string | null;
	access: string;
	isTemplate: number;
	inboundToken: string;
	archivedAt: string | null;
	accountId: number;
	createdBy: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface VisibleProjectRow extends ProjectRow {
	myRole: string | null;
	starred: number;
	notify: number | null;
}

const COLS = `p.id, p.name, p.description, p.icon, p.color, p.logo_url AS logoUrl, p.folder_id AS folderId,
  p.lead_id AS leadId, p.phase, p.status, p.start_on AS startOn, p.end_on AS endOn, p.access,
  p.is_template AS isTemplate, p.inbound_token AS inboundToken, p.archived_at AS archivedAt, p.account_id AS accountId,
  p.created_by AS createdBy, p.created_at AS createdAt, p.updated_at AS updatedAt`;

/**
 * Projects of workspace ?3 visible to user ?1. ?2 = workspace admin flag,
 * ?4 = workspace-client flag (workspace clients never see All-access projects).
 */
const VISIBLE = `SELECT ${COLS}, pm.role AS myRole, pm.notify AS notify,
  (SELECT COUNT(*) FROM project_stars s WHERE s.project_id = p.id AND s.user_id = ?1) AS starred
  FROM projects p
  LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?1
  WHERE p.account_id = ?3 AND (pm.user_id IS NOT NULL OR (p.access = 'all' AND ?4 = 0) OR ?2 = 1)`;

type Scope = [number, number, number, number];

/** Active (non-template, non-archived) projects visible to the viewer. */
export const listVisibleProjects = db.query<VisibleProjectRow, Scope>(
	`${VISIBLE} AND p.is_template = 0 AND p.archived_at IS NULL
   ORDER BY starred DESC, p.updated_at DESC`,
);
export const listArchivedProjects = db.query<VisibleProjectRow, Scope>(
	`${VISIBLE} AND p.is_template = 0 AND p.archived_at IS NOT NULL ORDER BY p.archived_at DESC`,
);
export const listTemplates = db.query<VisibleProjectRow, Scope>(
	`${VISIBLE} AND p.is_template = 1 ORDER BY p.name COLLATE NOCASE`,
);
export const findVisibleProject = db.query<VisibleProjectRow, [number, number, number, number, number]>(
	`${VISIBLE} AND p.id = ?5`,
);
export const findProject = db.query<ProjectRow, [number]>(
	`SELECT ${COLS} FROM projects p WHERE p.id = ?`,
);
export const findProjectByInbound = db.query<ProjectRow, [string]>(
	`SELECT ${COLS} FROM projects p WHERE p.inbound_token = ?`,
);

export const insertProject = db.query<
	{ id: number },
	[string, string, string, string, number | null, string, number | null, number, number]
>(
	`INSERT INTO projects (name, description, icon, color, folder_id, inbound_token, created_by, is_template, account_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
);
export const updateProject = db.query<
	null,
	[
		string, string, string, string, number | null, number | null, string, string,
		string | null, string | null, string, string, number,
	]
>(
	`UPDATE projects SET name = ?, description = ?, icon = ?, color = ?, folder_id = ?, lead_id = ?,
   phase = ?, status = ?, start_on = ?, end_on = ?, access = ?, updated_at = ? WHERE id = ?`,
);
export const updateProjectLogo = db.query<null, [string | null, number]>(
	`UPDATE projects SET logo_url = ? WHERE id = ?`,
);
export const moveProjectToFolder = db.query<null, [number | null, number]>(
	`UPDATE projects SET folder_id = ? WHERE id = ?`,
);
export const touchProject = db.query<null, [string, number]>(
	`UPDATE projects SET updated_at = ? WHERE id = ?`,
);
export const setProjectArchived = db.query<null, [string | null, number]>(
	`UPDATE projects SET archived_at = ? WHERE id = ?`,
);
export const setProjectTemplate = db.query<null, [number, number]>(
	`UPDATE projects SET is_template = ? WHERE id = ?`,
);
export const deleteProject = db.query<null, [number]>(
	`DELETE FROM projects WHERE id = ?`,
);

// Members ---------------------------------------------------------------------

export interface MemberRow {
	userId: number;
	role: string;
	notify: number;
}
export const listMembers = db.query<MemberRow, [number]>(
	`SELECT user_id AS userId, role, notify FROM project_members WHERE project_id = ? ORDER BY created_at`,
);
export const listMembersForProjects = db.query<MemberRow & { projectId: number }, [string]>(
	`SELECT project_id AS projectId, user_id AS userId, role, notify FROM project_members
   WHERE project_id IN (SELECT value FROM json_each(?)) ORDER BY created_at`,
);
export const addMember = db.query<null, [number, number, string]>(
	`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)
   ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role`,
);
export const removeMember = db.query<null, [number, number]>(
	`DELETE FROM project_members WHERE project_id = ? AND user_id = ?`,
);
export const setMemberNotify = db.query<null, [number, number, number]>(
	`UPDATE project_members SET notify = ? WHERE project_id = ? AND user_id = ?`,
);
export const listMemberships = db.query<{ projectId: number; role: string }, [number]>(
	`SELECT project_id AS projectId, role FROM project_members WHERE user_id = ?`,
);

// Tools -----------------------------------------------------------------------

export interface ToolRow {
	id: number;
	projectId: number;
	kind: string;
	name: string;
	position: number;
}
export const listTools = db.query<ToolRow, [number]>(
	`SELECT id, project_id AS projectId, kind, name, position FROM project_tools WHERE project_id = ? ORDER BY position, id`,
);
export const insertTool = db.query<null, [number, string, string, number]>(
	`INSERT OR IGNORE INTO project_tools (project_id, kind, name, position) VALUES (?, ?, ?, ?)`,
);
export const renameTool = db.query<null, [string, number, number]>(
	`UPDATE project_tools SET name = ? WHERE id = ? AND project_id = ?`,
);
export const setToolPosition = db.query<null, [number, number, number]>(
	`UPDATE project_tools SET position = ? WHERE id = ? AND project_id = ?`,
);
export const deleteTool = db.query<null, [number, number]>(
	`DELETE FROM project_tools WHERE id = ? AND project_id = ?`,
);

// Stars -----------------------------------------------------------------------

export const starProject = db.query<null, [number, number]>(
	`INSERT OR IGNORE INTO project_stars (user_id, project_id) VALUES (?, ?)`,
);
export const unstarProject = db.query<null, [number, number]>(
	`DELETE FROM project_stars WHERE user_id = ? AND project_id = ?`,
);

// Folders ---------------------------------------------------------------------

export interface FolderRow {
	id: number;
	accountId: number;
	name: string;
	color: string;
	position: number;
	projectCount: number;
}
export const listFolders = db.query<FolderRow, [number]>(
	`SELECT f.id, f.account_id AS accountId, f.name, f.color, f.position,
     (SELECT COUNT(*) FROM projects p WHERE p.folder_id = f.id AND p.archived_at IS NULL AND p.is_template = 0) AS projectCount
   FROM folders f WHERE f.account_id = ? ORDER BY f.position, f.name COLLATE NOCASE`,
);
export const findFolder = db.query<FolderRow, [number]>(
	`SELECT id, account_id AS accountId, name, color, position, 0 AS projectCount FROM folders WHERE id = ?`,
);
export const insertFolder = db.query<{ id: number }, [string, string, number, number]>(
	`INSERT INTO folders (name, color, created_by, account_id) VALUES (?, ?, ?, ?) RETURNING id`,
);
export const updateFolder = db.query<null, [string, string, number]>(
	`UPDATE folders SET name = ?, color = ? WHERE id = ?`,
);
export const deleteFolder = db.query<null, [number]>(
	`DELETE FROM folders WHERE id = ?`,
);
