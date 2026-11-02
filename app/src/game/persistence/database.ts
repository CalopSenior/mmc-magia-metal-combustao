import { DEMO_SLOT_ID } from '../config'

const DATABASE_NAME = 'mmc-engine'
const DATABASE_VERSION = 1
const SAVE_STORE = 'saves'

let databasePromise: Promise<IDBDatabase> | null = null

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha no IndexedDB.'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB não está disponível neste navegador.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SAVE_STORE)) {
        database.createObjectStore(SAVE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      const database = request.result
      database.onversionchange = () => database.close()
      resolve(database)
    }
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('Não foi possível abrir o banco local.'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('O banco local está bloqueado por outra aba.'))
    }
  })
  return databasePromise
}

export async function readSaveRecord(id: string): Promise<unknown> {
  const database = await openDatabase()
  const transaction = database.transaction(SAVE_STORE, 'readonly')
  return requestResult(transaction.objectStore(SAVE_STORE).get(id))
}

export async function writeSaveRecord<T extends { id: string }>(snapshot: T): Promise<void> {
  if(snapshot.id===DEMO_SLOT_ID) throw new Error('A exposição é protegida e não pode ser sobrescrita.')
  const database = await openDatabase()
  const transaction = database.transaction(SAVE_STORE, 'readwrite')
  transaction.objectStore(SAVE_STORE).put(snapshot)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao gravar o save.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Gravação do save cancelada.'))
  })
}

export async function deleteSaveRecord(id: string): Promise<void> {
  if(id===DEMO_SLOT_ID) throw new Error('A exposição é protegida e não pode ser apagada.')
  const database = await openDatabase()
  const transaction = database.transaction(SAVE_STORE, 'readwrite')
  transaction.objectStore(SAVE_STORE).delete(id)
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao apagar o save.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Exclusão do save cancelada.'))
  })
}
