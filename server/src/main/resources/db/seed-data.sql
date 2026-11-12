-- 干净数据的种子脚本：由当前开发库导出，仅包含用户、评论、点赞与统计

-- users：2 行
insert into "users" ("id", "email", "username", "password_hash", "display_name", "role", "last_login_ip", "last_login_at", "created_at") values ('98a6bf7e-cd59-4286-96af-f0f9d744f3ea', 'ljb2020423@163.com', 'Kiiriing', '$2a$10$sKlwbZ0SqyrduKJiD2Jzs.uTqxtfx6S9s.Nx8ElG7PuDU4kEFgMSO', 'Kiiriing', 'USER', '0:0:0:0:0:0:0:1', '2026-11-12T21:46:46.158263+08:00', '2026-11-11T00:02:26.640896+08:00');
insert into "users" ("id", "email", "username", "password_hash", "display_name", "role", "last_login_ip", "last_login_at", "created_at") values ('51bea6b9-929f-4f6b-bb49-003f18597a1d', 'liukiiriing@gmail.com', 'admin', '$2a$10$0Z6hFFl1emFC5QLnmdJk3.IMneqQf4YzaS7jQaR6rdzAkBmCK7hXK', 'Admin', 'ADMIN', '0:0:0:0:0:0:0:1', '2026-11-12T21:53:48.423275+08:00', '2026-11-10T21:50:16.423668+08:00');

-- post_comments：7 行
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('3f9483e7-25cc-4493-8786-35a5e2761b8d', '学到了 现在才知道原来这么简单', '2026-11-12T19:13:08.901236+08:00', false, 'idempotent-orders', NULL, '51bea6b9-929f-4f6b-bb49-003f18597a1d', NULL);
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('f1e30cf3-bc8d-4408-b4e1-0014737213f3', '一般', '2026-11-12T19:13:47.666189+08:00', false, 'idempotent-orders', '3f9483e7-25cc-4493-8786-35a5e2761b8d', '51bea6b9-929f-4f6b-bb49-003f18597a1d', NULL);
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('94c60307-4029-402b-a161-fd765f57b212', '叫你妈', '2026-11-12T20:57:10.30882+08:00', false, 'idempotent-orders', '3f9483e7-25cc-4493-8786-35a5e2761b8d', '98a6bf7e-cd59-4286-96af-f0f9d744f3ea', NULL);
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('b3b30e1a-ea6e-44b8-8eee-7203c1051422', '111', '2026-11-12T21:35:08.058945+08:00', false, 'idempotent-orders', '3f9483e7-25cc-4493-8786-35a5e2761b8d', '98a6bf7e-cd59-4286-96af-f0f9d744f3ea', NULL);
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('adcaa36c-3f7c-47d0-b61b-908d06e515cd', '666', '2026-11-12T21:35:17.460366+08:00', false, 'idempotent-orders', '3f9483e7-25cc-4493-8786-35a5e2761b8d', '98a6bf7e-cd59-4286-96af-f0f9d744f3ea', 'b3b30e1a-ea6e-44b8-8eee-7203c1051422');
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('a5164cab-65eb-42db-a978-91fd219443cc', '真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记真是个好的笔记', '2026-11-12T21:55:24.149912+08:00', false, 'idempotent-orders', NULL, '51bea6b9-929f-4f6b-bb49-003f18597a1d', NULL);
insert into "post_comments" ("id", "content", "created_at", "deleted", "post_slug", "parent_id", "user_id", "reply_to_id") values ('f4e7faf5-03e3-49b0-9efb-2bd8572f599a', '<h1>89899<h1>', '2026-11-12T22:01:31.932121+08:00', false, 'idempotent-orders', NULL, '51bea6b9-929f-4f6b-bb49-003f18597a1d', NULL);

-- comment_likes：3 行
insert into "comment_likes" ("id", "created_at", "comment_id", "user_id") values ('68d5e421-539c-4b3f-8456-881fe28e4580', '2026-11-12T21:58:25.891069+08:00', '3f9483e7-25cc-4493-8786-35a5e2761b8d', '51bea6b9-929f-4f6b-bb49-003f18597a1d');
insert into "comment_likes" ("id", "created_at", "comment_id", "user_id") values ('53b33beb-d0d4-424a-8a4f-c2e795ebd52a', '2026-11-12T21:58:49.146714+08:00', '94c60307-4029-402b-a161-fd765f57b212', '51bea6b9-929f-4f6b-bb49-003f18597a1d');
insert into "comment_likes" ("id", "created_at", "comment_id", "user_id") values ('73eaa447-98b1-4ff0-9890-499e18abdb6c', '2026-11-12T22:01:49.980453+08:00', 'adcaa36c-3f7c-47d0-b61b-908d06e515cd', '51bea6b9-929f-4f6b-bb49-003f18597a1d');

-- post_stats：2 行
insert into "post_stats" ("post_slug", "favorites", "likes", "views") values ('attendance-anti-cheat', 0, 0, 3);
insert into "post_stats" ("post_slug", "favorites", "likes", "views") values ('idempotent-orders', 1, 1, 23);

-- post_reactions：2 行
insert into "post_reactions" ("id", "created_at", "kind", "post_slug", "user_id") values ('eac88e3c-5e23-4366-b886-90ea52931e64', '2026-11-12T20:26:34.308639+08:00', 'FAVORITE', 'idempotent-orders', '51bea6b9-929f-4f6b-bb49-003f18597a1d');
insert into "post_reactions" ("id", "created_at", "kind", "post_slug", "user_id") values ('b0b08c34-18a0-40aa-9ee8-38d7cf998262', '2026-11-12T20:26:34.591782+08:00', 'LIKE', 'idempotent-orders', '51bea6b9-929f-4f6b-bb49-003f18597a1d');
