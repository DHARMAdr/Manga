/* =====================================================================
   oracle-setup.sql  -  WHAT TO PASTE INTO ORACLE (SQL Developer Web -> REST)
   Your tables stay as they are:
     file_posts (post_id, title)
     post_files (post_id, file_name, mime_type, file_size, file_content)
   Module: manga_api   (base path /api/)
   ===================================================================== */


/* ---------------------------------------------------------------------
   STEP 1 - UPLOAD HANDLER   (Template: upload/   Method: POST   Source: PL/SQL)
   What was wrong before:
   - ":status" does not exist in ORDS. The real name is ":status_code".
   - ":content_type" is not a defined value, so the handler broke.
   - "WHEN OTHERS ... 400" hid the real error. We removed it, so errors
     now show up in the browser console.
   PARAMETERS to define on this handler (click "Add parameter"):
     Name        Bind variable   Access   Source type   Data type
     title       title           IN       URI           STRING
     file_name   file_name       IN       URI           STRING
   ("URI" = the value comes after the "?" in the web address. We switched
    from HTTP Header because custom headers are often blocked by CORS.)
   --------------------------------------------------------------------- */
DECLARE
  v_post_id NUMBER;
BEGIN
  INSERT INTO file_posts (title)
  VALUES (NVL(:title, 'Uploaded from Web'))
  RETURNING post_id INTO v_post_id;

  INSERT INTO post_files (post_id, file_name, mime_type, file_size, file_content)
  VALUES (v_post_id, NVL(:file_name, 'file.pdf'), 'application/pdf',
          DBMS_LOB.GETLENGTH(:body), :body);   -- :body = the raw file sent by the browser

  COMMIT;
  :status_code := 201;                          -- 201 = "created"
END;


/* ---------------------------------------------------------------------
   STEP 2 - TWO READ ENDPOINTS
   (a) List   Template: posts/      Method: GET   Source: Collection Query
   --------------------------------------------------------------------- */
SELECT p.post_id,
       p.title AS post_title,
       f.file_name,
       ROUND(f.file_size / 1024 / 1024, 2) || ' MB' AS file_size,
       'https://g77d211159ce92b-mangafiles.adb.ap-hyderabad-1.oraclecloudapps.com/ords/mangasite/api/download/'
         || p.post_id AS download_url
FROM   file_posts p
JOIN   post_files f ON f.post_id = p.post_id
ORDER  BY p.post_id;

/* (b) Download   Template: download/:id   Method: GET   Source: Media Resource
       (Media Resource sends the file itself. The 1st column is the type,
        the 2nd column is the file data.) */
SELECT mime_type, file_content
FROM   post_files
WHERE  post_id = :id;


/* ---------------------------------------------------------------------
   STEP 3 - CORS: let YOUR GitHub site talk to Oracle
   Browsers block a website from calling another address unless that
   address says "this site is allowed". Run this once as a script, or fill
   the "Origins Allowed" box on the module page with the same text.
   Only the site address is used (no /Manga at the end).
   Add more addresses with commas, e.g. your local test server.
   --------------------------------------------------------------------- */
BEGIN
  ORDS.SET_MODULE_ORIGINS_ALLOWED(
    p_module_name     => 'manga_api',
    p_origins_allowed => 'https://dharmadr.github.io');
  COMMIT;
END;
/
