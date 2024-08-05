import axios from 'axios';

export class CryptoService {
  private apiUrl = 'https://api.coingecko.com/api/v3';

  async checkPriceChange(crypto: string, currency: string): Promise<number> {
    try {
      const response = await axios.get(`${this.apiUrl}/coins/markets`, {
        params: {
          vs_currency: currency,
          ids: crypto
        }
      });
      const data = response.data[0];
      return data.price_change_percentage_1h_in_currency;
    } catch (error) {
      console.error(`Error fetching data for ${crypto}:`, error);
      return 0;
    }
  }

  async getCurrentPrice(crypto: string, currency: string): Promise<number> {
    try {
      const response = await axios.get(`${this.apiUrl}/coins/markets`, {
        params: {
          vs_currency: currency,
          ids: crypto
        }
      });
      const data = response.data[0];
      return data.current_price;
    } catch (error) {
      console.error(`Error fetching data for ${crypto}:`, error);
      return 0;
    }
  }

  async getCoinNameBySymbol(symbol: string): Promise<string | null> {
    try {
      const response = await axios.get(`${this.apiUrl}/coins/list`);
      const coin = response.data.find((coin: any) => coin.symbol.toLowerCase() === symbol.toLowerCase());
      return coin ? coin.name : null;
    } catch (error) {
      console.error(`Error fetching coin name for symbol ${symbol}:`, error);
      return null;
    }
  }
}
