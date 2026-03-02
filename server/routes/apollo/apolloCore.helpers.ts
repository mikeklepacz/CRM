export function parseApolloOrganizationId(apolloAccountUrl: string | undefined): string | undefined {
    if (typeof apolloAccountUrl !== "string") {
        return undefined;
    }
    return (apolloAccountUrl.match(/\/accounts\/([a-f0-9]{24})/i)?.[1] ||
        apolloAccountUrl.match(/^[a-f0-9]{24}$/i)?.[0]);
}
