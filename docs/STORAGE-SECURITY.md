# Private storage design — not implemented

Planned private buckets: `azzora-project-documents`, `azzora-project-media`. No bucket or storage policy has been created locally or remotely at this checkpoint.

Object paths: `<workspace UUID>/<project UUID>/<documents|site-updates|snags|tasks>/<random UUID>.<validated extension>`. Display name lives in metadata. Require UUID-safe path parsing, authenticated project access and matching workspace/project relation. Authorize list/download/signed-URL issuance with the same access predicate. Upload/finalize/overwrite/delete must use the approved command permissions, not read access alone. Never use public URLs or public buckets; default to authenticated download, with short-lived signed URLs only when required.

Proposed configurable initial limits: 10 MB images, 25 MB documents; image JPEG/PNG/WebP, document PDF and selected Office formats. Validate MIME and size client-side for UX and in bucket/server settings for enforcement; check file signature in upload workflow where practical. These are development proposals, not company policy or malware scanning. SVG/HTML/executables are denied by default. Real malware scanning remains a production decision.

Reserve an upload with authorized project/entity ownership, upload under the unique reservation path, finalize metadata with authenticated actor and matching MIME/size/path, and clean orphaned uploads. A PostgreSQL transaction cannot atomically commit object-storage bytes. Keep object-delete and metadata-history semantics intentional. UI read tokens must not remain permanently persisted.

Required integration tests (not run): authorized upload/list/download/sign succeeds; anonymous/inactive/non-member, unrelated-project and cross-workspace upload/read/list/sign fails; attempted overwrite/delete fails without command authority; malicious prefixes, wrong MIME, excessive size and unowned reservations rejected. No browser data URLs will be imported into PostgreSQL.
