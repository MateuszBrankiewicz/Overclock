using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Overclock.Modules.Stats.Domain;

namespace Overclock.Modules.Stats.Infrastructure.Persistence;

public sealed class MatchRecordConfiguration : IEntityTypeConfiguration<MatchRecord>
{
    public void Configure(EntityTypeBuilder<MatchRecord> builder)
    {
        builder.ToTable("match_records");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id");

        builder.Property(x => x.RoomCode)
            .HasColumnName("room_code")
            .HasMaxLength(32)
            .IsRequired();

        builder.Property(x => x.WinnerId)
            .HasColumnName("winner_id");

        builder.Property(x => x.WinnerNickname)
            .HasColumnName("winner_nickname")
            .HasMaxLength(64);

        builder.Property(x => x.RoundCount)
            .HasColumnName("round_count")
            .IsRequired();

        builder.Property(x => x.BurntModulesCount)
            .HasColumnName("burnt_modules_count")
            .IsRequired();

        builder.Property(x => x.DurationSeconds)
            .HasColumnName("duration_seconds")
            .IsRequired();

        builder.Property(x => x.FinishedAtUtc)
            .HasColumnName("finished_at_utc")
            .IsRequired();

        builder.HasIndex(x => x.RoomCode);
        builder.HasIndex(x => x.FinishedAtUtc);
    }
}
