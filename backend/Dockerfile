# Multi-stage Dockerfile for Project: Overclock - Backend Host (.NET 10)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Disable IPv6 for reliable package restore
ENV DOTNET_SYSTEM_NET_DISABLEIPV6=1

# Copy solution and project files for layer caching
COPY backend/Overclock.slnx backend/
COPY backend/src/SharedKernel/*/*.csproj backend/src/SharedKernel/Overclock.SharedKernel/
COPY backend/src/Host/*/*.csproj backend/src/Host/Overclock.Host/
COPY backend/src/Modules/*/*/*.csproj backend/src/Modules/
COPY backend/tests/*/*.csproj backend/tests/

# Copy all backend source code
COPY backend/ backend/

# Publish release build of Host
WORKDIR /src/backend/src/Host/Overclock.Host
RUN dotnet publish -c Release -o /app/publish --no-restore || \
    dotnet publish -c Release -o /app/publish

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
