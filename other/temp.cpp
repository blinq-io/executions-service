set<int> s;

void closestValue(int x) {
    auto it = s.lower_bound(x);

    if(it == s.end()) {
        it--;
    } else if(it != s.begin()) {
        int bigger = *it;
        it--;
        int smaller = *it;
        if(abs(x - bigger) < abs(x - smaller)) {
            it++;
        }
    }
    cout << *it;
}