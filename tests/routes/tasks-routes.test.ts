import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth-guard", () => ({
  authGuard: vi.fn(async () => ({
    ok: true,
    context: { user: { id: "user_1", timezone: "UTC" } },
  })),
}));

vi.mock("@/modules/tasks/tasks.service", () => ({
  listTasks: vi.fn(async () => [{ id: "task_1" }]),
  createTask: vi.fn(async () => ({ id: "task_1" })),
  getTaskById: vi.fn(async () => ({ id: "task_1" })),
  updateTask: vi.fn(async () => ({ id: "task_1", title: "Updated" })),
  deleteTask: vi.fn(async () => ({ id: "task_1" })),
}));

vi.mock("@/modules/completions/completions.service", () => {
  class DomainError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  return {
    DomainError,
    completeTask: vi.fn(async () => ({ task: { id: "task_1", status: "completed" }, grantedXp: 25 })),
    reopenTask: vi.fn(async () => ({ task: { id: "task_1", status: "open" } })),
  };
});

import { GET as listTasksGET, POST as createTasksPOST } from "@/app/api/v1/tasks/route";
import {
  DELETE as deleteTaskDELETE,
  GET as getTaskGET,
  PATCH as patchTaskPATCH,
} from "@/app/api/v1/tasks/[id]/route";
import { POST as completeTaskPOST } from "@/app/api/v1/tasks/[id]/complete/route";
import { POST as reopenTaskPOST } from "@/app/api/v1/tasks/[id]/reopen/route";
import { completeTask, DomainError, reopenTask } from "@/modules/completions/completions.service";
import { createTask, deleteTask, getTaskById, listTasks, updateTask } from "@/modules/tasks/tasks.service";

const listTasksMock = vi.mocked(listTasks);
const createTaskMock = vi.mocked(createTask);
const getTaskByIdMock = vi.mocked(getTaskById);
const updateTaskMock = vi.mocked(updateTask);
const deleteTaskMock = vi.mocked(deleteTask);
const completeTaskMock = vi.mocked(completeTask);
const reopenTaskMock = vi.mocked(reopenTask);

describe("tasks routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/tasks", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Task" }),
    });

    const res = await createTasksPOST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "task_1" } });
    expect(createTaskMock).toHaveBeenCalled();
  });

  it("GET /api/v1/tasks", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks");
    const res = await listTasksGET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: [{ id: "task_1" }] });
    expect(listTasksMock).toHaveBeenCalled();
  });

  it("GET /api/v1/tasks/:id", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks/task_1");
    const res = await getTaskGET(req, { params: Promise.resolve({ id: "task_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "task_1" } });
  });

  it("PATCH /api/v1/tasks/:id", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks/task_1", {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated" }),
    });
    const res = await patchTaskPATCH(req, { params: Promise.resolve({ id: "task_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "task_1" } });
    expect(updateTaskMock).toHaveBeenCalled();
  });

  it("DELETE /api/v1/tasks/:id", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks/task_1", {
      method: "DELETE",
    });
    const res = await deleteTaskDELETE(req, { params: Promise.resolve({ id: "task_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { id: "task_1" } });
    expect(deleteTaskMock).toHaveBeenCalled();
  });

  it("POST /api/v1/tasks/:id/complete", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks/task_1/complete", {
      method: "POST",
    });

    const res = await completeTaskPOST(req, { params: Promise.resolve({ id: "task_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { grantedXp: 25 } });
    expect(completeTaskMock).toHaveBeenCalled();
  });

  it("POST /api/v1/tasks/:id/reopen", async () => {
    const req = new NextRequest("https://example.com/api/v1/tasks/task_1/reopen", {
      method: "POST",
    });

    const res = await reopenTaskPOST(req, { params: Promise.resolve({ id: "task_1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ success: true, error: null, data: { task: { status: "open" } } });
    expect(reopenTaskMock).toHaveBeenCalled();
  });

  it("maps domain errors on task actions", async () => {
    completeTaskMock.mockRejectedValueOnce(new DomainError(404, "TASK_NOT_FOUND", "task not found"));

    const req = new NextRequest("https://example.com/api/v1/tasks/missing/complete", {
      method: "POST",
    });

    const res = await completeTaskPOST(req, { params: Promise.resolve({ id: "missing" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({
      success: false,
      data: null,
      error: { code: "TASK_NOT_FOUND" },
    });
  });

  it("returns not found for foreign/missing task in CRUD", async () => {
    getTaskByIdMock.mockResolvedValueOnce(null);
    const req = new NextRequest("https://example.com/api/v1/tasks/other");
    const res = await getTaskGET(req, { params: Promise.resolve({ id: "other" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toMatchObject({ success: false, data: null, error: { code: "TASK_NOT_FOUND" } });
  });

  it("returns not found for update/delete when task is not owned", async () => {
    updateTaskMock.mockResolvedValueOnce(null);
    deleteTaskMock.mockResolvedValueOnce(null);

    const patchReq = new NextRequest("https://example.com/api/v1/tasks/other", {
      method: "PATCH",
      body: JSON.stringify({ title: "Nope" }),
    });
    const patchRes = await patchTaskPATCH(patchReq, { params: Promise.resolve({ id: "other" }) });
    const patchBody = await patchRes.json();
    expect(patchRes.status).toBe(404);
    expect(patchBody).toMatchObject({ success: false, data: null, error: { code: "TASK_NOT_FOUND" } });

    const deleteReq = new NextRequest("https://example.com/api/v1/tasks/other", {
      method: "DELETE",
    });
    const deleteRes = await deleteTaskDELETE(deleteReq, { params: Promise.resolve({ id: "other" }) });
    const deleteBody = await deleteRes.json();
    expect(deleteRes.status).toBe(404);
    expect(deleteBody).toMatchObject({ success: false, data: null, error: { code: "TASK_NOT_FOUND" } });
  });
});
