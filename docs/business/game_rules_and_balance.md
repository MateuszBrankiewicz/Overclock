# Project: Overclock – Reguły Gry, Karty Specjalne i Balans

Dokument precyzuje mechanikę modułów sprzętowych (Hardware Exploits), okna czasowe aktywacji oraz matematyczny model skalowania talii dla 2–4 graczy.

---

## 1. Moduły Sprzętowe (Hardware Exploits)

Każdy gracz na początku meczu otrzymuje **dokładnie jeden losowy moduł sprzętowy**. Moduł leży na stole **jawnie (face-up)** obok wirtualnego terminala gracza, dzięki czemu wszyscy rywale widzą dostępne narzędzia przeciwników.

### Okna Aktywacji (Timing Windows)
Moduł można aktywować wyłącznie w określonych fazach rozgrywki:
1. **Pre-Action Window:** W swojej turze, **zanim** gracz położy karty na blat stołu.
2. **Pre-Discharge Window:** Po przegranym blefie, **zanim** gracz uruchomi test kondensatora / wyładowania.
3. **Interrupt Window:** Natychmiast po zagraniu kart przez poprzednika, przed rozpoczęciem standardowej tury.

### Zestawienie Modułów

| Moduł | Okno Czasowe | Zasada Działania | Wpływ na Rozgrywkę |
| :--- | :--- | :--- | :--- |
| **`Packet Sniffer`** (Podgląd) | **Pre-Action** (własna tura) | Serwer ujawnia graczowi **1 losową kartę** z ostatnio zagranego pakietu leżącego na stole. Widzi ją tylko używający. | Daje pewność przy decyzji o sprawdzeniu (`TRACE`) lub spasowaniu, ale zdradza rywalom, że ruch był kalkulowany. |
| **`Ground Wire`** (Uziemienie) | **Pre-Discharge** (przed karą) | Redukuje bieżące ryzyko zwarcia o 50% (zaokrąglane w dół do poziomu minimalnego 1/6). | Ostatnia deska ratunku przy zaawansowanym stanie naładowania kondensatora. |
| **`Overclock Injector`** (Presja Czasu) | **Interrupt** (po ruchu rywala) | Skraca limit czasu następnego gracza z 20 s do **5 s**. Brak decyzji w czasie skutkuje automatycznym `TRACE`. | Wymusza pomyłki i panikę u graczy kalkulujących blef. |
| **`EMP Flare`** (Reset Stołu) | **Pre-Action** (własna tura) | Niszczy wszystkie karty aktualnie leżące na stole bez ich odkrywania. Gracz wybiera **nowy typ pakietu** i zagrywa pierwszą kartę. | Neutralizuje pułapkę przygotowaną przez poprzednika. |

> **Zasada Trwałego Zużycia (Burned Chip):** Użyty moduł ulega trwałemu przepaleniu — dioda gaśnie, a tekstura modułu pęka. Gracz **nie otrzymuje** nowego modułu w kolejnych rundach meczu.

---

## 2. Typy Kart w Talii

* **Karty Standardowe (Protokoły Podstawowe):**
  * `Alpha` (zielona sygnatura)
  * `Beta` (bursztynowa sygnatura)
  * `Gamma` (błękitna sygnatura)
* **Karty Dzikie (Wildcards):**
  * `Glitch` – uniwersalny pakiet danych; liczy się jako dowolna zadeklarowana karta (`Alpha`, `Beta`, `Gamma`). Zagranie `Glitch` nigdy nie jest kłamstwem, jeśli wymagany był jeden z protokołów bazowych.
* **Karty Zagrożenia (Forced Bluff):**
  * `Corrupted` (NULL) – uszkodzony pakiet niepasujący do żadnego protokołu. Zagranie tej karty to **zawsze blef**, co zmusza gracza posiadającego ją w ręku do kłamstwa przed końcem partii.

---

## 3. Matematyczny Balans i Skalowanie Talii

W grze turowej opartej na blefie kluczowe jest zachowanie odpowiedniego stosunku kart znanych (w ręku) do kart nieznanych (u rywali i w talii odrzuconej).

### Tabela Skalowania Talii

| Parametr | 4 Graczy | 3 Graczy | 2 Graczy |
| :--- | :---: | :---: | :---: |
| **Karty w ręku każdego gracza** | 5 | 5 | 5 |
| **Pakiety `Alpha`** | 6 | 5 | 4 |
| **Pakiety `Beta`** | 6 | 5 | 4 |
| **Pakiety `Gamma`** | 6 | 5 | 4 |
| **Pakiety `Glitch` (Joker)** | 2 | 2 | 1 |
| **Pakiety `Corrupted` (NULL)** | 2 | 1 | 1 |
| **Całkowita liczba kart w talii** | **22** | **18** | **14** |
| **Karty aktywne w rozdaniu** | 20 | 15 | 10 |
| **Karty odrzucone (Burned Pile)** | **2** | **3** | **4** |

### Rola Kart Odrzuconych (Burned Pile)
Na początku każdej rundy określa się losowo pulę kart odrzuconych (niewidocznych dla nikogo). Zapobiega to sytuacji, w której gracz posiadający komplet kart danego typu ma 100% pewności co do stanu stołu, wymuszając element szacowania ryzyka statystycznego.
---

## 4. Zasada Ostatniego Posiadacza Kart (Last Holder Rule)

Gracz, który wyłoży ostatnie karty z ręki, jest pomijany w kolejnych turach rundy. Jeśli **wszyscy rywale** (nie licząc wyeliminowanych) mają już puste ręce, ostatni gracz, który ma jeszcze karty, **nie może dalej zagrywać** — nikt nie mógłby go już sprawdzić. Jego jedynym legalnym ruchem jest `TRACE` na poprzednim zagraniu.

* Zasada obowiązuje przy każdej liczbie graczy, najczęściej jednak w pojedynku 1 na 1.
* Próba zagrania kart zwraca błąd `Turn.MustCallTrace`; interfejs blokuje przycisk wykładania i wskazuje `TRACE`.
* Jeśli czas tury minie, serwer automatycznie wykonuje `TRACE` (standardowa reakcja na timeout, gdy na stole leży pakiet).
* Wynik sprawdzenia przechodzi do standardowego testu napięcia (Voltage Test), więc runda zawsze kończy się karą dla jednej ze stron.
