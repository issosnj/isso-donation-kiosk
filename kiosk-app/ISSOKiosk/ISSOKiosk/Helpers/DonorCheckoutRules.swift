import Foundation

/// Pure donor-checkout rules for Step 3. No UI and no network.
struct DonorCheckoutRules: Sendable {
    static let addressDebounceNanoseconds: UInt64 = 380_000_000

    struct Draft: Equatable, Sendable {
        var firstName: String = ""
        var lastName: String = ""
        var phoneDigits: String = ""
        var email: String = ""
        var address: String = ""
    }

    struct SavedDonor: Equatable, Sendable {
        var name: String?
        var email: String?
        var address: String?
    }

    struct Submission: Equatable, Sendable {
        var name: String?
        var phone: String?
        var email: String?
        var address: String?
        var anonymous: Bool
    }

    enum Issue: Equatable, Sendable {
        case firstNameRequired
        case lastNameRequired
        case phoneRequired
        case emailInvalid
    }

    enum LookupStart: Equatable, Sendable {
        case ignore
        case start(phone: String, generation: Int)
    }

    enum LookupReceive: Equatable, Sendable {
        case stale
        case notFound
        case prompt
    }

    static func digits(from raw: String) -> String {
        String(raw.filter(\.isNumber).prefix(10))
    }

    /// Next stored value after one keypad digit. Extra digits past 10 are ignored.
    static func phoneDigitsByInserting(_ digit: Character, into stored: String) -> String {
        guard digit.isNumber else { return digits(from: stored) }
        return String((digits(from: stored) + String(digit)).prefix(10))
    }

    static func phoneDigitsByDeletingLast(from stored: String) -> String {
        var storedDigits = digits(from: stored)
        if !storedDigits.isEmpty { storedDigits.removeLast() }
        return storedDigits
    }

    /// Display only. The stored value remains digits.
    static func displayPhone(_ raw: String) -> String {
        let d = digits(from: raw)
        guard !d.isEmpty else { return "" }
        if d.count <= 3 { return "(\(d)" }
        let area = String(d.prefix(3))
        let rest = d.dropFirst(3)
        if d.count <= 6 { return "(\(area)) \(rest)" }
        let prefix = String(rest.prefix(3))
        let line = rest.dropFirst(3)
        return "(\(area)) \(prefix)-\(line)"
    }

    static func isValidEmail(_ raw: String) -> Bool {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return true }
        let pattern = #"^[A-Z0-9a-z._%+\-]+@[A-Z0-9a-z.\-]+\.[A-Za-z]{2,}$"#
        return trimmed.range(of: pattern, options: .regularExpression) != nil
    }

    static func issues(draft: Draft, anonymous: Bool) -> [Issue] {
        if anonymous { return [] }
        var found: [Issue] = []
        if draft.firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            found.append(.firstNameRequired)
        }
        if draft.lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            found.append(.lastNameRequired)
        }
        if digits(from: draft.phoneDigits).count != 10 {
            found.append(.phoneRequired)
        }
        if !isValidEmail(draft.email) {
            found.append(.emailInvalid)
        }
        return found
    }

    static func combinedName(first: String, last: String) -> String {
        let f = first.trimmingCharacters(in: .whitespacesAndNewlines)
        let l = last.trimmingCharacters(in: .whitespacesAndNewlines)
        if f.isEmpty && l.isEmpty { return "" }
        if l.isEmpty { return f }
        if f.isEmpty { return l }
        return "\(f) \(l)"
    }

    /// Last whitespace separates the last name so multi-word given names stay intact.
    static func splitFullName(_ full: String) -> (first: String, last: String) {
        let t = full.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return ("", "") }
        guard let range = t.range(of: " ", options: .backwards) else { return (t, "") }
        let first = String(t[..<range.lowerBound]).trimmingCharacters(in: .whitespacesAndNewlines)
        let last = String(t[range.upperBound...]).trimmingCharacters(in: .whitespacesAndNewlines)
        return (first, last)
    }

    static func submission(draft: Draft, anonymous: Bool) -> Submission {
        if anonymous {
            return Submission(name: nil, phone: nil, email: nil, address: nil, anonymous: true)
        }
        let name = combinedName(first: draft.firstName, last: draft.lastName)
        let phone = digits(from: draft.phoneDigits)
        let email = draft.email.trimmingCharacters(in: .whitespacesAndNewlines)
        let address = draft.address.trimmingCharacters(in: .whitespacesAndNewlines)
        return Submission(
            name: name.isEmpty ? nil : name,
            phone: phone.isEmpty ? nil : phone,
            email: email.isEmpty ? nil : email,
            address: address.isEmpty ? nil : address,
            anonymous: false
        )
    }

    /// Fills only fields the donor left empty. Never reveals data before this is called.
    static func applySavedDonor(_ saved: SavedDonor, to draft: Draft) -> Draft {
        var next = draft
        let firstEmpty = next.firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let lastEmpty = next.lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        if firstEmpty && lastEmpty, let name = saved.name?.trimmingCharacters(in: .whitespacesAndNewlines), !name.isEmpty {
            let parts = splitFullName(name)
            next.firstName = parts.first
            next.lastName = parts.last
        }
        if next.email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           let email = saved.email?.trimmingCharacters(in: .whitespacesAndNewlines), !email.isEmpty {
            next.email = email
        }
        if next.address.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
           let address = saved.address?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
            next.address = address
        }
        return next
    }

    static func turningAnonymousOn(_ draft: Draft) -> (snapshot: Draft, visible: Draft) {
        (draft, Draft())
    }

    static func turningAnonymousOff(snapshot: Draft?) -> Draft {
        snapshot ?? Draft()
    }

    static func shouldAcceptAddressResponse(generation: Int, expected: Int, query: String, current: String) -> Bool {
        generation == expected && query == current
    }
}

struct DonorLookupSession: Equatable, Sendable {
    var generation: Int = 0
    var anonymous: Bool = false
    var phoneDigits: String = ""
    var inFlightPhone: String?
    var settledPhone: String?

    mutating func invalidate() {
        generation += 1
        inFlightPhone = nil
        settledPhone = nil
    }

    mutating func notePhone(_ raw: String, anonymous: Bool) -> DonorCheckoutRules.LookupStart {
        self.anonymous = anonymous
        phoneDigits = DonorCheckoutRules.digits(from: raw)
        guard !anonymous, phoneDigits.count == 10 else {
            inFlightPhone = nil
            return .ignore
        }
        if settledPhone == phoneDigits || inFlightPhone == phoneDigits {
            return .ignore
        }
        inFlightPhone = phoneDigits
        return .start(phone: phoneDigits, generation: generation)
    }

    mutating func receive(phone: String, generation: Int, found: Bool) -> DonorCheckoutRules.LookupReceive {
        let digits = DonorCheckoutRules.digits(from: phone)
        guard generation == self.generation, !anonymous, phoneDigits == digits, inFlightPhone == digits else {
            return .stale
        }
        inFlightPhone = nil
        settledPhone = digits
        return found ? .prompt : .notFound
    }
}
