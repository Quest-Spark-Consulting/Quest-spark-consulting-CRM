const INITIAL_DATA = [
    { id: 1, name: "Cynthia Wanyonyi", industry: "Wellbeing", phone: "0711980306", status: "Onboarded", notes: "", pin: "2020", progressHistory: [] },
    { id: 2, name: "Mzito", industry: "Retail", phone: "0714644856", status: "Lead", notes: "", pin: "2020", progressHistory: [] },
    { id: 3, name: "Kelvin Kiilu", industry: "Fast food", phone: "0728223229", status: "Lead", notes: "", pin: "2020", progressHistory: [] },
    { id: 4, name: "Simon Njenga", industry: "Motor Spares", phone: "0721593935", status: "Lead", notes: "", pin: "2020", progressHistory: [] },
    { id: 5, name: "James Irungu", industry: "Retail", phone: "0723623819", status: "Lead", notes: "Mugo Pick up", pin: "2020", progressHistory: [] },
    { id: 6, name: "Lucy Wambui", industry: "Agribiz", phone: "0112932053", status: "Lead", notes: "", pin: "2020", progressHistory: [] },
    { id: 7, name: "Victoria", industry: "General", phone: "0710391082", status: "Lead", notes: "", pin: "2020", progressHistory: [] },
    { id: 8, name: "Winnie", industry: "General", phone: "0724964971", status: "Lead", notes: "", pin: "2020", progressHistory: [] },
    { id: 9, name: "Susan", industry: "General", phone: "0720825206", status: "Lead", notes: "", pin: "2020", progressHistory: [] }
];

const db = {
    save(data) {
        localStorage.setItem('crm_data', JSON.stringify(data));
        // Hook for cloud sync can be added here
    },
    load() {
        const data = localStorage.getItem('crm_data');
        if (!data) return INITIAL_DATA;
        
        // Ensure all items have progressHistory
        const parsed = JSON.parse(data);
        return parsed.map(item => ({
            ...item,
            pin: item.pin || '2020',
            progressHistory: item.progressHistory || [],
            feedbackHistory: item.feedbackHistory || []
        }));
    },
    addClient(client) {
        const data = this.load();
        const newClient = { 
            ...client, 
            id: Date.now(),
            pin: client.pin || '2020',
            progressHistory: [],
            feedbackHistory: []
        };
        data.push(newClient);
        this.save(data);
        return newClient;
    },
    updateClient(id, updates) {
        let data = this.load();
        data = data.map(c => c.id === id ? { ...c, ...updates } : c);
        this.save(data);
        return data;
    },
    addProgress(clientId, note, files, sender) {
        let data = this.load();
        data = data.map(c => {
            if (c.id === clientId) {
                const history = c.progressHistory || [];
                history.push({
                    date: new Date().toISOString(),
                    note: note,
                    files: files || [],
                    sender: sender || 'coach'
                });
                return { ...c, progressHistory: history };
            }
            return c;
        });
        this.save(data);
        return data;
    },
    addFeedback(clientId, text, files) {
        let data = this.load();
        data = data.map(c => {
            if (c.id === clientId) {
                const history = c.feedbackHistory || [];
                history.push({
                    date: new Date().toISOString(),
                    text: text,
                    files: files || []
                });
                return { ...c, feedbackHistory: history };
            }
            return c;
        });
        this.save(data);
        return data;
    },
    deleteClient(id) {
        let data = this.load();
        data = data.filter(c => c.id !== id);
        this.save(data);
        return data;
    }
};
