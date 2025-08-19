const axios = require('axios');
const logger = require('../utils/logger');

class CurrencyService {
    constructor() {
        this.defaultRates = {
            USD: { rate: 1250, change: 0, trend: 'neutral' },
            JPY: { rate: 920, change: 0, trend: 'neutral' },
            EUR: { rate: 1350, change: 0, trend: 'neutral' }
        };
    }

    async getRates() {
        try {
            if (!process.env.EXCHANGE_RATE_API_KEY) {
                return { rates: this.defaultRates, source: 'default' };
            }

            const response = await axios.get(
                'https://api.exchangerate-api.com/v4/latest/USD',
                { timeout: 5000 }
            );

            if (response.data && response.data.rates) {
                const krw = response.data.rates.KRW || 1250;
                return {
                    rates: {
                        USD: { rate: Math.round(krw), change: 0, trend: 'neutral' },
                        JPY: { rate: Math.round(krw / 100), change: 0, trend: 'neutral' },
                        EUR: { rate: Math.round(krw * 1.1), change: 0, trend: 'neutral' }
                    },
                    source: 'api'
                };
            }
        } catch (error) {
            logger.error('Currency API error:', error.message);
        }

        return { rates: this.defaultRates, source: 'fallback' };
    }

    getDefaultRates() {
        return this.defaultRates;
    }
}

module.exports = new CurrencyService();
