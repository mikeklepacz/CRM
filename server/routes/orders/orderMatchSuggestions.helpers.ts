export function stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2)
        return 0;
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2)
        return 1;
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0)
        return len2 === 0 ? 1 : 0;
    if (len2 === 0)
        return 0;
    const matrix: number[][] = [];
    for (let i = 0; i <= len2; i++)
        matrix[i] = [i];
    for (let j = 0; j <= len1; j++)
        matrix[0][j] = j;
    for (let i = 1; i <= len2; i++) {
        for (let j = 1; j <= len1; j++) {
            const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
}
