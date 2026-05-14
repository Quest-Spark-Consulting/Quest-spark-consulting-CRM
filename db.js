const SUPABASE_URL = 'https://fncdviwlfcvtpxhvuvke.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dEEBZ-XZbtq7GfBD5WIpRg_XJ3VTwxZ';
const _sb = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

function normalize(data) {
    return (data || []).map(item => ({
        ...item,
        pin: item.pin || '2020',
        progressHistory: item.progressHistory || [],
        feedbackHistory: item.feedbackHistory || []
    }));
}

let syncCallbacks = [];

const db = {
    onSync(fn) { syncCallbacks.push(fn); },
    triggerSync() { syncCallbacks.forEach(fn => fn(db.load())); },

    async save(data) {
        localStorage.setItem('crm_data', JSON.stringify(data));
        try {
            await _sb.from('app_data').upsert({ id: 1, data: data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
        } catch (e) { console.warn('Supabase sync failed (saving locally):', e.message); }
    },

    load() {
        const data = localStorage.getItem('crm_data');
        if (!data) return INITIAL_DATA;
        return normalize(JSON.parse(data));
    },

    async loadRemote() {
        try {
            const { data: row } = await _sb.from('app_data').select('data').eq('id', 1).single();
            if (row?.data) {
                localStorage.setItem('crm_data', JSON.stringify(row.data));
                return normalize(row.data);
            }
        } catch (e) { console.warn('Supabase fetch failed (using local):', e.message); }
        return this.load();
    },

    subscribe() {
        try {
            _sb.channel('app_data_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.1' }, () => {
                    this.loadRemote().then(() => this.triggerSync());
                })
                .subscribe();
        } catch (e) { console.warn('Supabase real-time not available:', e.message); }
    },

    async addClient(client) {
        const data = this.load();
        const newClient = { 
            ...client, 
            id: Date.now(),
            pin: client.pin || '2020',
            progressHistory: [],
            feedbackHistory: []
        };
        data.push(newClient);
        await this.save(data);
        return newClient;
    },

    async updateClient(id, updates) {
        let data = this.load();
        data = data.map(c => c.id === id ? { ...c, ...updates } : c);
        await this.save(data);
        return data;
    },

    async addProgress(clientId, note, files, sender) {
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
        await this.save(data);
        return data;
    },

    async addFeedback(clientId, text, files) {
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
        await this.save(data);
        return data;
    },

    async deleteClient(id) {
        let data = this.load();
        data = data.filter(c => c.id !== id);
        await this.save(data);
        return data;
    }
};