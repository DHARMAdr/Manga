/* =====================================================================
   oracle-delete.sql  -  paste these into Oracle (RESTful Services)
   Change delete0 to your own secret password (same one you type in
   the website prompt). Do NOT put the real password on GitHub.
   ===================================================================== */

/* ---- Template: delete/:id    Method: POST    Source Type: PL/SQL ----
   Parameter:  key | key | IN | URI | STRING                           */
DECLARE
  v_secret CONSTANT VARCHAR2(100) := 'delete0';
BEGIN
  IF :key IS NULL OR :key <> v_secret THEN
    :status_code := 403;          -- wrong password: delete nothing
    RETURN;
  END IF;
  DELETE FROM post_files WHERE post_id = :id;   -- child rows first
  DELETE FROM file_posts WHERE post_id = :id;   -- then the parent row
  COMMIT;                                        -- COMMIT makes it permanent
  :status_code := 204;
END;

/* ---- Template: deleteall/    Method: POST    Source Type: PL/SQL ----
   Parameter:  key | key | IN | URI | STRING                           */
DECLARE
  v_secret CONSTANT VARCHAR2(100) := 'delete0';
BEGIN
  IF :key IS NULL OR :key <> v_secret THEN
    :status_code := 403;
    RETURN;
  END IF;
  DELETE FROM post_files;
  DELETE FROM file_posts;
  COMMIT;
  :status_code := 204;
END;
