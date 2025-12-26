// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Ваши ключи (уже есть)
const supabaseUrl = 'https://ghvosdpasvkodhgitnij.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdodm9zZHBhc3Zrb2RoZ2l0bmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDMyNjQsImV4cCI6MjA4MjI3OTI2NH0.SvKy2IUULiDs2Nldrhdhi6k3k0zMTOhMnPqMpTjXRNM'

// Создаем клиент
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Проверка подключения
export async function testConnection() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(2)
  
  if (error) {
    console.error('❌ Ошибка подключения к Supabase:', error)
    return false
  } else {
    console.log('✅ Успешное подключение! Найдено товаров:', data.length)
    return true
  }
}
