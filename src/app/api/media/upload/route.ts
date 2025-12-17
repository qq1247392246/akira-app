import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const GITEE_REPO = process.env.GITEE_IMAGE_REPO ?? "akira-no/image";
const GITEE_BRANCH = process.env.GITEE_IMAGE_BRANCH ?? "master";
const GITEE_TOKEN =
  process.env.GITEE_IMAGE_TOKEN ?? process.env.GITEE_TOKEN ?? process.env.GITEE_ACCESS_TOKEN ?? "";

function assertGiteeEnv() {
  if (!GITEE_TOKEN) {
    throw new Error("缺少 Gitee 图床 access token（GITEE_IMAGE_TOKEN）");
  }
  if (!GITEE_REPO.includes("/")) {
    throw new Error("GITEE_IMAGE_REPO 格式应为 owner/repo");
  }
}

export async function POST(request: Request) {
  try {
    assertGiteeEnv();
  } catch (error) {
    console.error("[media/upload] 环境变量错误", error);
    return NextResponse.json({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }

  const [owner, repo] = GITEE_REPO.split("/");
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `journal/${new Date().toISOString().split("T")[0]}/${randomUUID()}.${extension}`;
  const apiUrl = new URL(
    `https://gitee.com/api/v5/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
      repo
    )}/contents/${filePath}`
  );

  const uploadRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: GITEE_TOKEN,
      branch: GITEE_BRANCH,
      content: buffer.toString("base64"),
      message: `Akira 上传日记图片 ${file.name}`,
    }),
  });

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json().catch(() => ({}));
    console.error("[media/upload] Gitee 上传失败", errorData);
    return NextResponse.json(
      {
        error:
          errorData.message ??
          `上传失败：Gitee API ${uploadRes.status} ${uploadRes.statusText}，请检查仓库/Token 权限`,
      },
      { status: uploadRes.status === 401 || uploadRes.status === 403 ? 401 : 500 }
    );
  }

  const result = await uploadRes.json();
  const encodedPath = filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const rawUrl = `https://gitee.com/${owner}/${repo}/raw/${GITEE_BRANCH}/${encodedPath}?raw=1`;

  return NextResponse.json({
    url: rawUrl,
    path: result?.content?.path ?? filePath,
    provider: "gitee",
    sha: result?.content?.sha,
  });
}
