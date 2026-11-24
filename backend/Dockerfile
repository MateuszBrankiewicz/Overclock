# Multi-stage Dockerfile for Project: Overclock - Backend Host (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Disable IPv6 for reliable package restore
ENV DOTNET_SYSTEM_NET_DISABLEIPV6=1

# Restore layer: only the project files (same paths as in the repo), so `dotnet restore` stays cached
# until a package reference or project reference changes. Add a line here when a project is added.
COPY backend/src/Host/Overclock.Host/Overclock.Host.csproj backend/src/Host/Overclock.Host/
COPY backend/src/Modules/Economy/Overclock.Modules.Economy.Application/Overclock.Modules.Economy.Application.csproj backend/src/Modules/Economy/Overclock.Modules.Economy.Application/
COPY backend/src/Modules/Economy/Overclock.Modules.Economy.Contracts/Overclock.Modules.Economy.Contracts.csproj backend/src/Modules/Economy/Overclock.Modules.Economy.Contracts/
COPY backend/src/Modules/Economy/Overclock.Modules.Economy.Domain/Overclock.Modules.Economy.Domain.csproj backend/src/Modules/Economy/Overclock.Modules.Economy.Domain/
COPY backend/src/Modules/Economy/Overclock.Modules.Economy.Infrastructure/Overclock.Modules.Economy.Infrastructure.csproj backend/src/Modules/Economy/Overclock.Modules.Economy.Infrastructure/
COPY backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/Overclock.Modules.GameEngine.Application.csproj backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Application/
COPY backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Contracts/Overclock.Modules.GameEngine.Contracts.csproj backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Contracts/
COPY backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/Overclock.Modules.GameEngine.Domain.csproj backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Domain/
COPY backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Infrastructure/Overclock.Modules.GameEngine.Infrastructure.csproj backend/src/Modules/GameEngine/Overclock.Modules.GameEngine.Infrastructure/
COPY backend/src/Modules/Identity/Overclock.Modules.Identity.Application/Overclock.Modules.Identity.Application.csproj backend/src/Modules/Identity/Overclock.Modules.Identity.Application/
COPY backend/src/Modules/Identity/Overclock.Modules.Identity.Contracts/Overclock.Modules.Identity.Contracts.csproj backend/src/Modules/Identity/Overclock.Modules.Identity.Contracts/
COPY backend/src/Modules/Identity/Overclock.Modules.Identity.Domain/Overclock.Modules.Identity.Domain.csproj backend/src/Modules/Identity/Overclock.Modules.Identity.Domain/
COPY backend/src/Modules/Identity/Overclock.Modules.Identity.Infrastructure/Overclock.Modules.Identity.Infrastructure.csproj backend/src/Modules/Identity/Overclock.Modules.Identity.Infrastructure/
COPY backend/src/Modules/Stats/Overclock.Modules.Stats.Application/Overclock.Modules.Stats.Application.csproj backend/src/Modules/Stats/Overclock.Modules.Stats.Application/
COPY backend/src/Modules/Stats/Overclock.Modules.Stats.Contracts/Overclock.Modules.Stats.Contracts.csproj backend/src/Modules/Stats/Overclock.Modules.Stats.Contracts/
COPY backend/src/Modules/Stats/Overclock.Modules.Stats.Domain/Overclock.Modules.Stats.Domain.csproj backend/src/Modules/Stats/Overclock.Modules.Stats.Domain/
COPY backend/src/Modules/Stats/Overclock.Modules.Stats.Infrastructure/Overclock.Modules.Stats.Infrastructure.csproj backend/src/Modules/Stats/Overclock.Modules.Stats.Infrastructure/
COPY backend/src/SharedKernel/Overclock.SharedKernel/Overclock.SharedKernel.csproj backend/src/SharedKernel/Overclock.SharedKernel/

RUN dotnet restore backend/src/Host/Overclock.Host/Overclock.Host.csproj

# Copy all backend source code (bin/obj are excluded by .dockerignore)
COPY backend/ backend/

# Publish release build of Host (restore already done above)
RUN dotnet publish backend/src/Host/Overclock.Host/Overclock.Host.csproj -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5000
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 5000

# Run as non-root user for security
USER $APP_UID

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Overclock.Host.dll"]
