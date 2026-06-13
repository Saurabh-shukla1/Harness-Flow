const webSerch = async (query: string, depth: string) => {
    // Placeholder implementation for web search using Tavily API

    const apiKey = process.env.TAVILY_API_KEY;
    const baseURL = "https://api.tavily.com/search";

    const response = await fetch(baseURL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        }, 
        body: JSON.stringify({
            query: query,
            max_results: 5,
            depth: depth,
        })
    })

    return await response.json();
}

export default webSerch;