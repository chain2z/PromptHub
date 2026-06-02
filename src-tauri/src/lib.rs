use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create initial schema",
        sql: "
            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL UNIQUE
            );
            CREATE TABLE IF NOT EXISTS prompt_tags (
                prompt_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (prompt_id, tag_id),
                FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt ON prompt_tags(prompt_id);
            CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag ON prompt_tags(tag_id);
        ",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:vault.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
