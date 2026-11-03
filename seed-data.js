// Default data (admin panel ke "Seed" button se ek baar bharta hai)
module.exports = {
  settings: {
    whatsapp: '91XXXXXXXXXX',
    email: 'youragency@gmail.com',
    instagram: '',
    youtube: '',
    heroTitle_en: 'We turn your coaching & business into a growth machine',
    heroTitle_hi: 'Hum aapki coaching aur business ko online grow karte hain',
    heroSub_en: 'Video editing, social media, websites and local SEO, all under one roof.',
    heroSub_hi: 'Video editing, social media, website aur local SEO, sab ek jagah.'
  },
  pricing: [
    { vertical: 'local', name_en: 'Local Basic Setup', name_hi: 'Local Basic Setup', price: 8000, period: 'one-time', popular: false,
      features_en: ['Basic web presence', 'Google Business Profile setup', 'Basic social profiling'],
      features_hi: ['Basic web presence', 'Google Business Profile setup', 'Basic social profiling'] },
    { vertical: 'local', name_en: 'Local Premium Setup', name_hi: 'Local Premium Setup', price: 20000, period: 'one-time', popular: true,
      features_en: ['Full custom website', 'Complete local SEO', 'GMB ranking work', 'Social branding'],
      features_hi: ['Full custom website', 'Complete local SEO', 'GMB ranking ka kaam', 'Social branding'] },
    { vertical: 'local', name_en: 'Local Monthly Growth Plan', name_hi: 'Local Monthly Growth Plan', price: 5000, period: 'month', popular: false,
      features_en: ['10 UGC-style video edits', '12 social posts', 'GMB posts & updates', 'Review management', 'WhatsApp catalog update', 'Monthly report'],
      features_hi: ['10 UGC-style video edits', '12 social posts', 'GMB posts aur updates', 'Review management', 'WhatsApp catalog update', 'Monthly report'] },
    { vertical: 'education', name_en: 'Education Basic Retainer', name_hi: 'Education Basic Retainer', price: 10000, period: 'month', popular: false,
      features_en: ['Fixed number of reels/shorts', 'Hinglish motion subtitles', 'Sound design & dead-space cutting'],
      features_hi: ['Fixed number mein reels/shorts', 'Hinglish motion subtitles', 'Sound design aur dead-space cutting'] },
    { vertical: 'education', name_en: 'Education Premium Retainer', name_hi: 'Education Premium Retainer', price: 20000, period: 'month', popular: true,
      features_en: ['Daily shorts', 'High-end animations', 'Formula/diagram overlays', 'Fast turnaround'],
      features_hi: ['Daily shorts', 'High-end animations', 'Formula/diagram overlays', 'Fast turnaround'] },
    { vertical: 'bundle', name_en: 'Complete Growth Bundle', name_hi: 'Complete Growth Bundle', price: 35000, priceFrom: true, period: 'month', popular: false,
      features_en: ['Video editing', 'Social media management', 'Website/portal maintenance'],
      features_hi: ['Video editing', 'Social media management', 'Website/portal maintenance'] }
  ]
};
