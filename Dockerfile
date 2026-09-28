FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY SkumOgSandhed.sln ./
COPY Domain/Domain.csproj Domain/
COPY Application/Application.csproj Application/
COPY Persistence/Persistence.csproj Persistence/
COPY Api/Api.csproj Api/
COPY Client/Client.csproj Client/

RUN dotnet restore Client/Client.csproj

COPY . .
RUN dotnet publish Client/Client.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Client.dll"]
