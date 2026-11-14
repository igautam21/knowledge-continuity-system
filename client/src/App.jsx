import ReactMarkdown from "react-markdown";

import { useEffect, useMemo, useState } from "react";

import Auth from "./components/Auth";

import { getKnowledge, createKnowledge, searchKnowledge, apiRequest } from "./services/api";

import "./App.css";

const navigation = [

  { label: "Overview", icon: "◫" },

  { label: "My Knowledge", icon: "▤" },

  { label: "Projects", icon: "▦" },

  { label: "AI Assistant", icon: "✧" },

];

function App() {

  // Authentication state

  const [currentUser, setCurrentUser] = useState(() => {

    const savedUser = sessionStorage.getItem("user");

    const savedToken = sessionStorage.getItem("token");

    if (savedToken && savedUser) {

      try {

        return JSON.parse(savedUser);

      } catch {

        sessionStorage.removeItem("user");

        sessionStorage.removeItem("token");

      }

    }

    return null;

  });

  // Dashboard state

  const [activeNav, setActiveNav] = useState("Overview");

  const [search, setSearch] = useState("");

  const [semanticResults, setSemanticResults] = useState([]);

  const [searchPerformed, setSearchPerformed] = useState(false);

  const [searching, setSearching] = useState(false);

  const [knowledge, setKnowledge] = useState([]);

  const [selectedEntry, setSelectedEntry] = useState(null);

  // Loading and error states

  const [loadingKnowledge, setLoadingKnowledge] = useState(false);

  const [submittingKnowledge, setSubmittingKnowledge] = useState(false);

  const [knowledgeError, setKnowledgeError] = useState("");

  // New knowledge form state

  const [showForm, setShowForm] = useState(false);

  const [newTitle, setNewTitle] = useState("");

  const [newContent, setNewContent] = useState("");

  // AI Assistant state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [askingAssistant, setAskingAssistant] = useState(false);
  const [assistantError, setAssistantError] = useState("");

  // Handle successful login or registration

  function handleAuthSuccess(user) {

    sessionStorage.setItem("user", JSON.stringify(user));

    setCurrentUser(user);

  }

  // Handle logout

  function handleLogout() {

    sessionStorage.removeItem("token");

    sessionStorage.removeItem("user");

    setCurrentUser(null);

    setKnowledge([]);

    setSelectedEntry(null);

    setChatMessages([]);

    setChatInput("");

    setAssistantError("");

    setActiveNav("Overview");

    setSearch("");

  }

  // Convert backend records into dashboard entries

  function formatKnowledgeEntries(items) {

    return items.map((item, index) => ({

      id: item._id,

      title: item.title,

      description: item.content,

      category: "Knowledge Entry",

      author: currentUser.name,

      date: item.createdAt

        ? new Date(item.createdAt).toLocaleDateString()

        : "Recently added",

      status: item.status

        ? item.status.charAt(0).toUpperCase() + item.status.slice(1)

        : "Pending",

      color: ["purple", "blue", "orange"][index % 3],

      summary: item.summary || "",
      similarityScore: item.similarityScore,

    }));

  }

  // Fetch knowledge entries from MongoDB

  async function loadKnowledge(showLoader = false) {

    try {

      if (showLoader) {

        setLoadingKnowledge(true);

      }

      setKnowledgeError("");

      const data = await getKnowledge();

      const entries = formatKnowledgeEntries(data.knowledge || []);

      setKnowledge(entries);

    } catch (error) {

      setKnowledgeError(error.message);

      // If the session is invalid, return to login

      if (

        error.message.toLowerCase().includes("token") ||

        error.message.toLowerCase().includes("unauthorized")

      ) {

        handleLogout();

      }

    } finally {

      setLoadingKnowledge(false);

    }

  }

  // Load knowledge when the user logs in

  useEffect(() => {

    if (!currentUser) return;

    loadKnowledge(true);

  }, [currentUser]);

  // Refresh entries while AI summaries are being generated

  useEffect(() => {

    if (!currentUser) return;

    const hasPendingJobs = knowledge.some(

      (item) =>

        item.status === "Pending" || item.status === "Processing"

    );

    if (!hasPendingJobs) return;

    const intervalId = setInterval(() => {

      loadKnowledge(false);

    }, 5000);

    return () => clearInterval(intervalId);

  }, [currentUser, knowledge]);

  // Search knowledge

  const filteredKnowledge = useMemo(() => {

    const query = search.toLowerCase();

    return knowledge.filter(

      (entry) =>

        entry.title.toLowerCase().includes(query) ||

        entry.description.toLowerCase().includes(query) ||

        entry.category.toLowerCase().includes(query)

    );

  }, [knowledge, search]);

  // Search knowledge by meaning using the semantic search API

  async function handleSemanticSearch(event) {

    event.preventDefault();

    const query = search.trim();

    if (!query) {

      setSearchPerformed(false);

      setSemanticResults([]);

      return;

    }

    try {

      setSearching(true);

      setKnowledgeError("");

      const data = await searchKnowledge(query);

      const results = formatKnowledgeEntries(data.results || []);

      setSemanticResults(results);

      setSearchPerformed(true);

    } catch (error) {

      setKnowledgeError(error.message);

      setSemanticResults([]);

      setSearchPerformed(false);

    } finally {

      setSearching(false);

    }

  }

  // Ask the RAG assistant using the authenticated backend endpoint
  async function handleAskAssistant(event) {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || askingAssistant) return;

    setAssistantError("");
    setChatInput("");
    setChatMessages((previous) => [
      ...previous,
      { id: `${Date.now()}-user`, role: "user", content: question },
    ]);
    setAskingAssistant(true);

    try {
      // Send the previous conversation turns so the backend can
      // understand follow-up questions such as "which database does it use?"
      const conversationHistory = chatMessages
        .slice(-10)
        .map(({ role, content }) => ({ role, content }));

      const data = await apiRequest("/summaries/ask", {
        method: "POST",
        body: JSON.stringify({
          question,
          conversationHistory,
        }),
      });

      setChatMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data.answer || "I couldn't generate an answer for that question.",
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
    } catch (error) {
      setAssistantError(error.message || "The AI Assistant request failed.");
    } finally {
      setAskingAssistant(false);
    }
  }

  function openAssistantSource(source) {
    const sourceId = source.id || source._id || source.knowledgeId;
    const matchingEntry = knowledge.find((entry) => entry.id === sourceId);
    if (matchingEntry) setSelectedEntry(matchingEntry);
  }

  // Submit knowledge to the backend

  async function handleLocalSubmit(event) {

    event.preventDefault();

    if (!newTitle.trim() || !newContent.trim()) return;

    try {

      setSubmittingKnowledge(true);

      setKnowledgeError("");

      await createKnowledge({

        title: newTitle.trim(),

        content: newContent.trim(),

      });

      // Refresh the list after successful submission

      await loadKnowledge(false);

      setNewTitle("");

      setNewContent("");

      setShowForm(false);

    } catch (error) {

      setKnowledgeError(error.message);

    } finally {

      setSubmittingKnowledge(false);

    }

  }

  // Show authentication page when logged out

  if (!currentUser) {

    return <Auth onAuthSuccess={handleAuthSuccess} />;

  }

  // User initials

  const initials = currentUser.name

    .split(" ")

    .filter(Boolean)

    .map((part) => part[0])

    .join("")

    .slice(0, 2)

    .toUpperCase();

  // Dashboard statistics

  const completedCount = knowledge.filter(

    (item) => item.status === "Completed"

  ).length;

  const inProgressCount = knowledge.filter(

    (item) =>

      item.status === "Processing" || item.status === "Pending"

  ).length;

  const categoryCount = new Set(

    knowledge.map((item) => item.category)

  ).size;

  return (

    <div className="app-shell">

      {/* Sidebar */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark">K</div>

          <div>

            <h2>

              Knowledge<span>Hub</span>

            </h2>

            <p>CONTINUITY SYSTEM</p>

          </div>

        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="sidebar-nav">

          {navigation.map((item) => (

            <button

              key={item.label}

              className={`nav-item ${

                activeNav === item.label ? "active" : ""

              }`}

              onClick={() => setActiveNav(item.label)}

            >

              <span className="nav-icon">{item.icon}</span>

              <span>{item.label}</span>

              {item.label === "AI Assistant" && (

                <span className="nav-new">AI</span>

              )}

            </button>

          ))}

        </nav>

        <div className="sidebar-bottom">

          <div className="help-card">

            <div className="help-icon">✦</div>

            <h3>Preserve what matters.</h3>

            <p>

              Your team's knowledge deserves to stay accessible.

            </p>

          </div>

          <div className="profile">

            <div className="avatar">{initials}</div>

            <div className="profile-info">

              <strong>{currentUser.name}</strong>

              <span>Workspace member</span>

            </div>

            <button

              className="profile-menu"

              onClick={handleLogout}

              title="Log out"

            >

              Logout

            </button>

          </div>

        </div>

      </aside>

      {/* Main dashboard */}

      <main className="main-area">

        <header className="topbar">

          <div className="breadcrumb">

            Workspace <span>/</span> <strong>{activeNav}</strong>

          </div>

          <div className="topbar-actions">

            <span className="environment-tag">LIVE WORKSPACE</span>

            <button

              className="icon-button"

              aria-label="Notifications"

            >

              ♧

            </button>

            <div className="top-avatar">{initials}</div>

          </div>

        </header>

        <div className="page-content">

          {activeNav === "AI Assistant" ? (
            <section className="assistant-page">
              <div className="assistant-heading">
                <div>
                  <div className="eyebrow"><span className="eyebrow-dot"></span> KNOWLEDGEHUB AI</div>
                  <h1>AI Assistant <span>✦</span></h1>
                  <p>Ask questions about your team's knowledge and get answers grounded in your workspace.</p>
                </div>
                <button type="button" className="filter-button"
                  onClick={() => { setChatMessages([]); setAssistantError(""); setChatInput(""); }}
                  disabled={askingAssistant || chatMessages.length === 0}>
                  New conversation
                </button>
              </div>
              <div className="assistant-chat-panel">
                <div className="assistant-chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="assistant-empty">
                      <div className="assistant-empty-icon">✧</div>
                      <h2>What would you like to know?</h2>
                      <p>Ask about projects, deployment workflows, tools, solutions, or team handovers.</p>
                      <button type="button" className="assistant-suggestion"
                        onClick={() => setChatInput("How does our team deploy applications and manage backend infrastructure?")}>
                        How does our team deploy applications and manage backend infrastructure?
                      </button>
                    </div>
                  )}
                  {chatMessages.map((message) => (
                    <article key={message.id} className={`assistant-message ${message.role}`}>
                      <div className="assistant-message-label">{message.role === "user" ? "You" : "KnowledgeHub AI"}</div>
                      <div className="assistant-message-content"><ReactMarkdown>{message.content}</ReactMarkdown></div>
                      {message.role === "assistant" && message.sources?.length > 0 && (
                        <div className="assistant-sources">
                          <strong>Sources from your workspace</strong>
                          <div className="assistant-source-list">
                            {message.sources.map((source, index) => (
                              <button type="button" key={source.id || source._id || index}
                                className="assistant-source" onClick={() => openAssistantSource(source)}>
                                <span>[Source {source.sourceNumber || index + 1}]</span>
                                {source.title}
                                <small>{Math.round((source.similarityScore || 0) * 100)}% relevance</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                  {askingAssistant && (
                    <div className="assistant-thinking"><span className="assistant-thinking-dot"></span>
                      Searching your knowledge and preparing an answer...</div>
                  )}
                </div>
                {assistantError && <div className="auth-error assistant-error" role="alert">{assistantError}</div>}
                <form className="assistant-composer" onSubmit={handleAskAssistant}>
                  <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Ask anything about your team's knowledge..." rows={2} maxLength={1000}
                    disabled={askingAssistant} />
                  <div className="assistant-composer-footer">
                    <span>Answers are generated from your workspace knowledge.</span>
                    <button type="submit" className="primary-button" disabled={askingAssistant || !chatInput.trim()}>
                      {askingAssistant ? "Thinking..." : "Send"} <span>➤</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>
          ) : (
            <>
          {/* Welcome section */}

          <section className="welcome-section">

            <div>

              <div className="eyebrow">

                <span className="eyebrow-dot"></span>

                YOUR ORGANIZATIONAL MEMORY

              </div>

              <h1>

                Good morning, {currentUser.name.split(" ")[0]}{" "}

                <span>✦</span>

              </h1>

              <p>

                Keep your team's knowledge connected, organized, and ready

                for what comes next.

              </p>

            </div>

            <button

              className="primary-button"

              onClick={() => {

                setKnowledgeError("");

                setShowForm(true);

              }}

            >

              <span>＋</span> New knowledge

            </button>

          </section>

          {/* Error message */}

          {knowledgeError && (

            <div className="auth-error" role="alert">

              {knowledgeError}

            </div>

          )}

          {/* Statistics */}

          <section className="stats-grid">

            <div className="stat-card">

              <div className="stat-top">

                <span>Total knowledge</span>

                <span className="stat-icon purple-icon">▤</span>

              </div>

              <div className="stat-number">{knowledge.length}</div>

              <div className="stat-foot">Saved in your workspace</div>

            </div>

            <div className="stat-card">

              <div className="stat-top">

                <span>AI summaries</span>

                <span className="stat-icon green-icon">✧</span>

              </div>

              <div className="stat-number">{completedCount}</div>

              <div className="stat-foot">Successfully generated</div>

            </div>

            <div className="stat-card">

              <div className="stat-top">

                <span>In progress</span>

                <span className="stat-icon orange-icon">◷</span>

              </div>

              <div className="stat-number">{inProgressCount}</div>

              <div className="stat-foot">Awaiting completion</div>

            </div>

            <div className="stat-card">

              <div className="stat-top">

                <span>Knowledge categories</span>

                <span className="stat-icon blue-icon">▦</span>

              </div>

              <div className="stat-number">{categoryCount}</div>

              <div className="stat-foot">Unique categories</div>

            </div>

          </section>

          {/* Recent knowledge */}

          <section className="content-section">

            <div className="section-heading">

              <div>

                <h2>Recent knowledge</h2>

                <p>

                  Explore the latest information added to your workspace.

                </p>

              </div>

              <button

                className="text-button"

                onClick={() => setActiveNav("My Knowledge")}

              >

                View all <span>→</span>

              </button>

            </div>

            <div className="filter-bar">

              <form className="search-box" onSubmit={handleSemanticSearch}>

                <span>⌕</span>

                <input

                  type="text"

                  placeholder="Ask anything about your team's knowledge..."

                  value={search}

                  onChange={(event) => {

                    setSearch(event.target.value);

                    setSearchPerformed(false);

                    setSemanticResults([]);

                  }}

                />

                <button

                  type="submit"

                  className="semantic-search-button"

                  disabled={searching || !search.trim()}

                >

                  {searching ? "Searching..." : "Search"}

                </button>

              </form>

              {search && (

                <button

                  className="filter-button"

                  type="button"

                  onClick={() => {

                    setSearch("");

                    setSemanticResults([]);

                    setSearchPerformed(false);

                    setKnowledgeError("");

                  }}

                >

                  Clear

                </button>

              )}

            </div>

            <div className="knowledge-list">

              {loadingKnowledge ? (

                <div className="empty-state">

                  <h3>Loading your knowledge...</h3>

                  <p>Please wait while we connect to your workspace.</p>

                </div>

              ) : (searchPerformed ? semanticResults : filteredKnowledge).length > 0 ? (

                (searchPerformed ? semanticResults : filteredKnowledge).map((entry) => (

                  <article

                    className="knowledge-card"

                    key={entry.id}

                  >

                    <div className={`document-icon ${entry.color}`}>

                      ▤

                    </div>

                    <div className="knowledge-info">

                      <div className="knowledge-title-row">

                        <h3>{entry.title}</h3>

                        <span

                          className={`status status-${entry.status.toLowerCase()}`}

                        >

                          <span></span>

                          {entry.status}

                        </span>

                      </div>

                      <p>{entry.description}</p>

                      <div className="knowledge-meta">

                        <span>{entry.category}</span>

                        <span className="meta-separator">•</span>

                        <span>{entry.author}</span>

                        <span className="meta-separator">•</span>

                        <span>{entry.date}</span>

                    {entry.similarityScore !== undefined && (

                      <>

                        <span className="meta-separator">•</span>

                        <span>

                          Relevance: {(entry.similarityScore * 100).toFixed(1)}%

                        </span>

                      </>

                    )}

                      </div>

                    </div>

                    <button

                      className="entry-arrow"

                      aria-label={`View ${entry.title}`}

                      onClick={() => setSelectedEntry(entry)}

                    >

                      →

                    </button>

                  </article>

                ))

              ) : (

                <div className="empty-state">

                  <span>⌕</span>

                  <h3>

                    {searchPerformed

                      ? "No relevant knowledge found"

                      : search

                        ? "No matching knowledge found"

                        : "No knowledge entries yet"}

                  </h3>

                  <p>

                    {searchPerformed

                      ? "Try asking your question differently."

                      : search

                        ? "Press Search to find knowledge by meaning."

                        : "Click New knowledge to save your first entry."}

                  </p>

                </div>

              )}

            </div>

          </section>

          <footer className="page-footer">

            <span>

              KnowledgeHub - Knowledge Continuity System

            </span>

            <span>

              Built to preserve organizational knowledge.

            </span>

          </footer>
            </>
          )}

        </div>

      </main>

      {/* Add knowledge modal */}

      {showForm && (

        <div

          className="modal-backdrop"

          onClick={() => {

            if (!submittingKnowledge) setShowForm(false);

          }}

        >

          <form

            className="modal"

            onSubmit={handleLocalSubmit}

            onClick={(event) => event.stopPropagation()}

          >

            <button

              type="button"

              className="modal-close"

              onClick={() => setShowForm(false)}

              disabled={submittingKnowledge}

            >

              ×

            </button>

            <div className="modal-kicker">KNOWLEDGE CAPTURE</div>

            <h2>Add new knowledge</h2>

            <p>

              Record important project information for your team.

            </p>

            <label htmlFor="knowledge-title">Title</label>

            <input

              id="knowledge-title"

              value={newTitle}

              onChange={(event) => setNewTitle(event.target.value)}

              placeholder="e.g. Project deployment process"

              maxLength={150}

              required

            />

            <label htmlFor="knowledge-content">

              Knowledge content

            </label>

            <textarea

              id="knowledge-content"

              value={newContent}

              onChange={(event) => setNewContent(event.target.value)}

              placeholder="Describe tasks, tools, challenges, and solutions..."

              rows="5"

              required

            />

            {knowledgeError && (

              <div className="auth-error" role="alert">

                {knowledgeError}

              </div>

            )}

            <button

              type="submit"

              className="primary-button modal-submit"

              disabled={submittingKnowledge}

            >

              {submittingKnowledge

                ? "Saving..."

                : "Save knowledge"}

            </button>

            <span className="modal-note">

              Your knowledge will be securely saved to your workspace.

            </span>

          </form>

        </div>

      )}

      {/* Knowledge detail modal */}

      {selectedEntry && (

        <div

          className="modal-backdrop"

          onClick={() => setSelectedEntry(null)}

        >

          <div

            className="modal detail-modal"

            onClick={(event) => event.stopPropagation()}

          >

            <button

              className="modal-close"

              onClick={() => setSelectedEntry(null)}

            >

              ×

            </button>

            <div className="modal-kicker">KNOWLEDGE DETAILS</div>

            <h2>{selectedEntry.title}</h2>

            <p>{selectedEntry.description}</p>

            <div className="detail-divider"></div>

            <h3>AI summary</h3>

<div className="markdown-summary">

  <ReactMarkdown>

    {selectedEntry.summary ||

      (selectedEntry.status === "Failed"

        ? "Summary generation failed. Please check the backend logs."

        : "The AI summary is being generated. Please wait.")}

  </ReactMarkdown>

</div>

            <div className="detail-status">

              Status: <strong>{selectedEntry.status}</strong>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

export default App;
