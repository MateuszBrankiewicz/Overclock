using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Overclock.Modules.Stats.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "stats");

            migrationBuilder.CreateTable(
                name: "match_records",
                schema: "stats",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    room_code = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    winner_id = table.Column<Guid>(type: "uuid", nullable: true),
                    winner_nickname = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    round_count = table.Column<int>(type: "integer", nullable: false),
                    burnt_modules_count = table.Column<int>(type: "integer", nullable: false),
                    duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    finished_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_match_records", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_match_records_finished_at_utc",
                schema: "stats",
                table: "match_records",
                column: "finished_at_utc");

            migrationBuilder.CreateIndex(
                name: "IX_match_records_room_code",
                schema: "stats",
                table: "match_records",
                column: "room_code");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "match_records",
                schema: "stats");
        }
    }
}
